import datetime
import json
import time
from fastapi import APIRouter, HTTPException, Query

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.ml.forecast import forecast_temperature
from services.api.app.models.forecast import ForecastResponse, ForecastPoint
from services.api.app.models.common import ApiResponse

router = APIRouter(prefix="/forecast", tags=["forecast"])

CACHE_TTL = 21600  # 6 tiếng theo yêu cầu của Leader


def _is_transient_network_error(exc: Exception) -> bool:
    message = str(exc)
    return "WinError 10035" in message or "ReadError" in message or "timed out" in message


def _execute_with_retry(query, *, retries: int = 3, backoff_seconds: float = 0.2):
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            return query.execute()
        except Exception as exc:
            last_error = exc
            if attempt == retries - 1 or not _is_transient_network_error(exc):
                raise
            time.sleep(backoff_seconds * (attempt + 1))

    if last_error is not None:
        raise last_error
    raise RuntimeError("Unexpected empty retry state")

@router.get("/{city_id}", response_model=ApiResponse[ForecastResponse])
def get_forecast(
    city_id: int, 
    days: int = Query(7, description="Số ngày muốn dự báo (Tối đa 14)", le=14)
):
    cache_key = f"forecast:{city_id}:{days}:{datetime.date.today().isoformat()}"
    cache = get_redis()

# 1. Kiểm tra Cache
    cached = cache.get(cache_key)
    if isinstance(cached, str): 
        return ApiResponse(success=True, data=ForecastResponse(**json.loads(cached)))

    db = get_supabase()

    # 2. Lấy 90 bản ghi gần nhất để đảm bảo last_date luôn là ngày hiện tại
    weather_res = _execute_with_retry(
        db.table("weather_daily")
        .select("date, temperature_2m_mean")
        .eq("city_id", city_id)
        .order("date", desc=True)
        .limit(90)
    )

    if not weather_res.data or len(weather_res.data) < 30:
        raise HTTPException(
            status_code=400,
            detail="Không đủ dữ liệu lịch sử để chạy mô hình dự báo (yêu cầu >= 30 ngày)"
        )

    # 3. Sắp xếp lại theo thứ tự tăng dần (model cần ascending order)
    weather_res.data.sort(key=lambda r: r["date"])

    # 4. Chạy hàm dự báo
    predictions = forecast_temperature(weather_res.data, days_ahead=days)

    if not predictions:
        raise HTTPException(status_code=500, detail="Lỗi trong quá trình tính toán dự báo")

    # 4. Trả về kết quả và lưu Cache
    response_data = ForecastResponse(
        city_id=city_id,
        forecast_days=days,
        trends=[ForecastPoint(**p) for p in predictions]
    )

    cache.setex(
        cache_key,
        CACHE_TTL,
        response_data.model_dump_json()
    )

    return ApiResponse(success=True, data=response_data)