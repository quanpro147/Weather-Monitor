import json
import time

from fastapi import APIRouter, HTTPException, Query

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.models.city import City
from services.api.app.models.common import ApiResponse

router = APIRouter(prefix="/cities", tags=["cities"])

CACHE_TTL = 86400  # 24h — city list rarely changes


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


@router.get("", response_model=ApiResponse[list[City]])
def list_cities(
    country: str | None = Query(None, description="Filter by country name"),
    min_lat: float | None = Query(None, ge=-90, le=90, description="Minimum latitude"),
    max_lat: float | None = Query(None, ge=-90, le=90, description="Maximum latitude"),
    min_lng: float | None = Query(None, ge=-180, le=180, description="Minimum longitude"),
    max_lng: float | None = Query(None, ge=-180, le=180, description="Maximum longitude"),
    limit: int | None = Query(None, ge=1, le=2000, description="Maximum number of rows"),
):
    if (min_lat is None) != (max_lat is None):
        raise HTTPException(status_code=422, detail="min_lat and max_lat must be provided together")
    if (min_lng is None) != (max_lng is None):
        raise HTTPException(status_code=422, detail="min_lng and max_lng must be provided together")
    if min_lat is not None and max_lat is not None and min_lat > max_lat:
        raise HTTPException(status_code=422, detail="min_lat must be <= max_lat")
    if min_lng is not None and max_lng is not None and min_lng > max_lng:
        raise HTTPException(status_code=422, detail="min_lng must be <= max_lng")

    cache_key = (
        "cities:"
        f"country={country or 'all'}:"
        f"lat={min_lat if min_lat is not None else 'all'}:{max_lat if max_lat is not None else 'all'}:"
        f"lng={min_lng if min_lng is not None else 'all'}:{max_lng if max_lng is not None else 'all'}:"
        f"limit={limit if limit is not None else 'all'}"
    )
    cache = get_redis()

    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    query = db.table("cities").select("*").order("city")
    if country:
        query = query.eq("country", country)
    if min_lat is not None and max_lat is not None:
        query = query.gte("latitude", min_lat).lte("latitude", max_lat)
    if min_lng is not None and max_lng is not None:
        query = query.gte("longitude", min_lng).lte("longitude", max_lng)
    if limit is not None:
        query = query.limit(limit)

    response = _execute_with_retry(query)
    cities = [City(**row) for row in response.data]

    cache.setex(cache_key, CACHE_TTL, json.dumps([c.model_dump() for c in cities]))
    return ApiResponse(success=True, data=cities)


@router.get("/search", response_model=ApiResponse[list[City]])
def search_cities(q: str = Query(..., min_length=1, description="Keyword to search in city name")):
    """Search cities by name (case-insensitive, partial match)."""
    cache_key = f"cities:search:{q.lower()}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    response = _execute_with_retry(
        db.table("cities")
        .select("*")
        .ilike("city", f"%{q}%")
        .order("city")
    )
    cities = [City(**row) for row in response.data]

    cache.setex(cache_key, CACHE_TTL, json.dumps([c.model_dump() for c in cities]))
    return ApiResponse(success=True, data=cities)


@router.get("/{city_id}", response_model=ApiResponse[City])
def get_city(city_id: int):
    cache_key = f"city:{city_id}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    response = _execute_with_retry(db.table("cities").select("*").eq("city_id", city_id))

    if not response.data:
        raise HTTPException(status_code=404, detail=f"City {city_id} not found")

    city = City(**response.data[0])
    cache.setex(cache_key, CACHE_TTL, city.model_dump_json())
    return ApiResponse(success=True, data=city)
