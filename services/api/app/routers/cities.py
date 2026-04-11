import json

from fastapi import APIRouter, HTTPException, Query

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.models.city import City
from services.api.app.models.common import ApiResponse

router = APIRouter(prefix="/cities", tags=["cities"])

CACHE_TTL = 86400  # 24h — city list rarely changes


@router.get("", response_model=ApiResponse[list[City]])
def list_cities(country: str | None = Query(None, description="Filter by country name")):
    cache_key = f"cities:{country or 'all'}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if cached:
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    query = db.table("cities").select("*").order("city")
    if country:
        query = query.eq("country", country)

    response = query.execute()
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
    response = (
        db.table("cities")
        .select("*")
        .ilike("city", f"%{q}%")
        .order("city")
        .execute()
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
    response = db.table("cities").select("*").eq("city_id", city_id).execute()

    if not response.data:
        raise HTTPException(status_code=404, detail=f"City {city_id} not found")

    city = City(**response.data[0])
    cache.setex(cache_key, CACHE_TTL, city.model_dump_json())
    return ApiResponse(success=True, data=city)
