import datetime
import json
import time
from fastapi import APIRouter, HTTPException

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.ml.anomaly import detect_anomalies
from services.api.app.ml.forecast import compute_trend_summary
from services.api.app.ml.summary import generate_weather_summary
from services.api.app.models.summary import SummaryResponse
from services.api.app.models.common import ApiResponse

router = APIRouter(prefix="/summary", tags=["summary"])

CACHE_TTL = 3600  # 1 hour — saves Gemini quota


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


@router.get("/{city_id}", response_model=ApiResponse[SummaryResponse])
def get_summary(city_id: int):
    cache_key = f"summary:{city_id}:{datetime.date.today().isoformat()}"
    cache = get_redis()

    # 1. Check Redis cache
    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=SummaryResponse(**json.loads(cached)))

    db = get_supabase()

    # 2. Fetch city name
    city_res = _execute_with_retry(db.table("cities").select("city").eq("city_id", city_id))
    if not city_res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy thành phố")
    city_name = city_res.data[0]["city"]

    # 3. Fetch last 30 days of weather (enough for Isolation Forest training)
    today = datetime.date.today()
    start_30_days = today - datetime.timedelta(days=30)

    weather_res = _execute_with_retry(
        db.table("weather_daily")
        .select("*")
        .eq("city_id", city_id)
        .gte("date", start_30_days.isoformat())
        .order("date")
    )

    if not weather_res.data:
        raise HTTPException(status_code=404, detail="Chưa có dữ liệu thời tiết cho thành phố này")

    # 4. Detect anomalies, filter to last 7 days
    annotated_records = detect_anomalies(weather_res.data)

    start_7_days = today - datetime.timedelta(days=7)
    recent_7_days = [r for r in annotated_records if datetime.date.fromisoformat(r["date"]) >= start_7_days]
    recent_anomalies = [r for r in recent_7_days if r.get("is_anomaly")]

    # 5. Compute trend
    trend = compute_trend_summary(weather_res.data)

    # 6. Generate AI summary — now returns (text, provider, confidence)
    try:
        summary_text, provider_label, confidence = generate_weather_summary(
            city_name, weather_res.data, recent_anomalies
        )
    except Exception as exc:
        print(f"[summary] Summary generation failed for city_id={city_id}: {exc}")
        fallback = SummaryResponse(
            city_name=city_name,
            summary_text="Không thể tạo tóm tắt lúc này. Vui lòng xem biểu đồ chi tiết.",
            provider="Unavailable",
            period_days=len(weather_res.data),
            anomaly_count=len(recent_anomalies),
            trend_direction=trend.get("direction", "stable"),
            confidence_level="low",
            confidence_score=0,
            confidence_reason="Lỗi kết nối dịch vụ AI.",
        )
        return ApiResponse(success=True, data=fallback)

    # 7. Prepare response and cache
    response_data = SummaryResponse(
        city_name=city_name,
        summary_text=summary_text,
        provider=provider_label,
        period_days=len(weather_res.data),
        anomaly_count=len(recent_anomalies),
        trend_direction=trend.get("direction", "stable"),
        confidence_level=confidence.get("level", "medium"),
        confidence_score=confidence.get("score", 50),
        confidence_reason=confidence.get("reason", ""),
    )

    cache.setex(cache_key, CACHE_TTL, response_data.model_dump_json())
    return ApiResponse(success=True, data=response_data)