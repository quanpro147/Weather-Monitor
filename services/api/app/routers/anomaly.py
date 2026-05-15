import datetime
import json

from fastapi import APIRouter, HTTPException, Query

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.ml.anomaly import detect_anomalies
from services.api.app.models.anomaly import AnomalyRecord
from services.api.app.models.common import ApiResponse

router = APIRouter(prefix="/anomaly", tags=["anomaly"])

CACHE_TTL = 21600    # 6h — historical data doesn't change
HISTORY_YEARS = 3    # training window for Isolation Forest


@router.get("/{city_id}", response_model=ApiResponse[list[AnomalyRecord]])
def get_anomalies(
    city_id: int,
    start_date: datetime.date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="End date (YYYY-MM-DD)"),
):
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must be before end_date")

    cache_key = f"anomaly:{city_id}:{start_date}:{end_date}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()

    # Limit training data to HISTORY_YEARS before end_date — enough for Isolation Forest
    # to learn seasonal norms without fetching the entire table.
    history_cutoff = (end_date - datetime.timedelta(days=HISTORY_YEARS * 365)).isoformat()
    response = (
        db.table("weather_daily")
        .select("*")
        .eq("city_id", city_id)
        .gte("date", history_cutoff)
        .order("date")
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail=f"No weather data for city {city_id}")

    # Annotate every record with anomaly_score and is_anomaly
    annotated = detect_anomalies(response.data)

    # Filter down to the requested date range
    in_range = [
        r for r in annotated
        if start_date <= datetime.date.fromisoformat(r["date"]) <= end_date
    ]

    records = [AnomalyRecord(**r) for r in in_range]
    cache.setex(
        cache_key,
        CACHE_TTL,
        json.dumps([r.model_dump(mode="json") for r in records]),
    )
    return ApiResponse(success=True, data=records)
