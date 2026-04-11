import datetime
import json

from fastapi import APIRouter, HTTPException, Query

from app.core.cache import get_redis
from app.core.database import get_supabase
from app.models.common import ApiResponse
from app.models.weather import WeatherDaily

router = APIRouter(prefix="/weather", tags=["weather"])

CACHE_TTL = 21600  # 6h — historical data doesn't change


@router.get("/{city_id}/latest", response_model=ApiResponse[WeatherDaily])
def get_latest_weather(city_id: int):
    cache_key = f"weather:{city_id}:latest"
    cache = get_redis()

    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    response = (
        db.table("weather_daily")
        .select("*")
        .eq("city_id", city_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail=f"No weather data for city {city_id}")

    record = WeatherDaily(**response.data[0])
    cache.setex(cache_key, CACHE_TTL, record.model_dump_json())
    return ApiResponse(success=True, data=record)


@router.get("/{city_id}", response_model=ApiResponse[list[WeatherDaily]])
def get_weather(
    city_id: int,
    start_date: datetime.date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="End date (YYYY-MM-DD)"),
):
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must be before end_date")

    cache_key = f"weather:{city_id}:{start_date}:{end_date}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    response = (
        db.table("weather_daily")
        .select("*")
        .eq("city_id", city_id)
        .gte("date", str(start_date))
        .lte("date", str(end_date))
        .order("date")
        .execute()
    )

    records = [WeatherDaily(**row) for row in response.data]
    cache.setex(
        cache_key,
        CACHE_TTL,
        json.dumps([r.model_dump(mode="json") for r in records]),
    )
    return ApiResponse(success=True, data=records)
