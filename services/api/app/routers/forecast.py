import datetime
import json
from fastapi import APIRouter, HTTPException, Query

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.ml.forecast import forecast_temperature
from services.api.app.models.forecast import ForecastResponse, ForecastPoint
from services.api.app.models.common import ApiResponse

router = APIRouter(prefix="/forecast", tags=["forecast"])

CACHE_TTL = 21600  # 6 tiếng theo yêu cầu của Leader

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

    # 2. Lấy dữ liệu lịch sử để nạp vào mô hình Numpy
    weather_res = (
        db.table("weather_daily")
        .select("date, temperature_2m_mean")
        .eq("city_id", city_id)
        .order("date")
        .execute()
    )

    if not weather_res.data or len(weather_res.data) < 30:
        raise HTTPException(
            status_code=400, 
            detail="Không đủ dữ liệu lịch sử để chạy mô hình dự báo (yêu cầu >= 30 ngày)"
        )

    # 3. Chạy hàm dự báo
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