import datetime
import json
from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.models.common import ApiResponse
from services.api.app.models.weather import (
    AdvisoryResponse,
    CityWeatherCompare,
    ExtremeResult,
    WeatherCurrentResponse,
    WeatherDaily,
    WeatherStats,
)
from services.api.app.services.weather_provider import fetch_current_enrichment

router = APIRouter(prefix="/weather", tags=["weather"])

CACHE_TTL = 21600       # 6h — historical data is stable
ADVISORY_TTL = 3600     # 1h — advisory is based on latest data


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_mean(values: list[float | None]) -> float | None:
    valid = [v for v in values if v is not None]
    return round(sum(valid) / len(valid), 2) if valid else None


def _safe_max(values: list[float | None]) -> float | None:
    valid = [v for v in values if v is not None]
    return max(valid) if valid else None


# ── Cross-city endpoints (static names — declare before /{city_id}) ───────────

@router.get("/compare", response_model=ApiResponse[list[CityWeatherCompare]])
def compare_cities(
    city_ids: str = Query(..., description="Comma-separated city IDs, e.g. 1,2,3"),
):
    """Compare latest weather across up to 10 cities."""
    try:
        ids = [int(x.strip()) for x in city_ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="city_ids must be comma-separated integers")

    if not ids or len(ids) > 10:
        raise HTTPException(status_code=400, detail="Provide between 1 and 10 city IDs")

    cache_key = f"compare:{','.join(str(i) for i in sorted(ids))}"
    cache = get_redis()
    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()

    # Fetch city names in one query
    city_resp = db.table("cities").select("city_id, city").in_("city_id", ids).execute()
    city_names: dict[int, str] = {row["city_id"]: row["city"] for row in city_resp.data}

    # Fetch recent weather for all cities in one query (last 14 days as window)
    cutoff = (datetime.date.today() - datetime.timedelta(days=14)).isoformat()
    weather_resp = (
        db.table("weather_daily")
        .select("city_id, date, temperature_2m_mean, temperature_2m_max, rain_sum, wind_speed_10m_max, weather_code")
        .in_("city_id", ids)
        .gte("date", cutoff)
        .order("date", desc=True)
        .execute()
    )

    # Take the latest row per city (rows are already sorted desc by date)
    latest: dict[int, dict] = {}
    for row in weather_resp.data:
        cid = row["city_id"]
        if cid not in latest:
            latest[cid] = row

    results: list[CityWeatherCompare] = []
    for city_id in ids:
        row = latest.get(city_id)
        results.append(CityWeatherCompare(
            city_id=city_id,
            city_name=city_names.get(city_id, f"City {city_id}"),
            date=datetime.date.fromisoformat(row["date"]) if row else None,
            temperature_2m_mean=row.get("temperature_2m_mean") if row else None,
            temperature_2m_max=row.get("temperature_2m_max") if row else None,
            rain_sum=row.get("rain_sum") if row else None,
            wind_speed_10m_max=row.get("wind_speed_10m_max") if row else None,
            weather_code=row.get("weather_code") if row else None,
        ))

    cache.setex(cache_key, CACHE_TTL, json.dumps([r.model_dump(mode="json") for r in results]))
    return ApiResponse(success=True, data=results)


@router.get("/extremes", response_model=ApiResponse[ExtremeResult])
def weather_extremes(
    type: Literal["hottest", "rainiest"] = Query(..., description="hottest or rainiest"),
    start_date: datetime.date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="End date (YYYY-MM-DD)"),
):
    """Find the city with the highest temperature or rainfall in a date range."""
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")

    cache_key = f"extremes:{type}:{start_date}:{end_date}"
    cache = get_redis()
    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    field = "temperature_2m_max" if type == "hottest" else "rain_sum"

    resp = (
        db.table("weather_daily")
        .select(f"city_id, date, {field}")
        .gte("date", str(start_date))
        .lte("date", str(end_date))
        .order(field, desc=True)
        .limit(20)  # fetch top 20 to filter out nulls in Python
        .execute()
    )

    # Skip null values (PostgreSQL puts nulls first in DESC order)
    best = next((r for r in resp.data if r.get(field) is not None), None)
    if best is None:
        raise HTTPException(status_code=404, detail=f"No {type} data found for the given range")

    city_resp = (
        db.table("cities")
        .select("city")
        .eq("city_id", best["city_id"])
        .execute()
    )
    city_name = city_resp.data[0]["city"] if city_resp.data else f"City {best['city_id']}"

    result = ExtremeResult(
        city_id=best["city_id"],
        city_name=city_name,
        value=best[field],
        type=type,
        date=datetime.date.fromisoformat(best["date"]),
    )

    cache.setex(cache_key, CACHE_TTL, result.model_dump_json())
    return ApiResponse(success=True, data=result)


# ── Per-city endpoints ────────────────────────────────────────────────────────

@router.get("/{city_id}/current", response_model=ApiResponse[WeatherCurrentResponse])
def get_current_weather(city_id: int):
    """Get the most recent weather record for a city."""
    cache_key = f"weather:{city_id}:current"
    cache = get_redis()
    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    resp = (
        db.table("weather_daily")
        .select("*")
        .eq("city_id", city_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )

    if not resp.data:
        raise HTTPException(status_code=404, detail=f"No weather data for city {city_id}")

    latest_row = resp.data[0]

    city_resp = (
        db.table("cities")
        .select("latitude, longitude")
        .eq("city_id", city_id)
        .limit(1)
        .execute()
    )
    if not city_resp.data:
        raise HTTPException(status_code=404, detail=f"City {city_id} not found")

    city_row = city_resp.data[0]
    enrichment = fetch_current_enrichment(float(city_row["latitude"]), float(city_row["longitude"]))

    precipitation = enrichment.get("precipitation")
    if precipitation is None:
        precipitation = latest_row.get("rain_sum")

    payload = {
        **latest_row,
        "air_quality_index": enrichment.get("air_quality_index"),
        "pressure": enrichment.get("pressure"),
        "visibility": enrichment.get("visibility"),
        "precipitation": precipitation,
        "aqi": enrichment.get("air_quality_index"),
    }

    record = WeatherCurrentResponse(**payload)
    cache.setex(cache_key, CACHE_TTL, record.model_dump_json())
    return ApiResponse(success=True, data=record)


@router.get("/{city_id}/history", response_model=ApiResponse[list[WeatherDaily]])
def get_weather_history(
    city_id: int,
    start_date: datetime.date | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: datetime.date | None = Query(None, description="End date (YYYY-MM-DD)"),
    days: int | None = Query(None, ge=1, le=365, description="Last N days — alternative to start_date/end_date"),
):
    """Get historical weather for a date range or the last N days."""
    if days is not None:
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=days)
    elif start_date is None or end_date is None:
        raise HTTPException(
            status_code=400,
            detail="Provide either 'days' or both 'start_date' and 'end_date'",
        )

    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must be before end_date")

    cache_key = f"weather:{city_id}:history:{start_date}:{end_date}"
    cache = get_redis()
    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    resp = (
        db.table("weather_daily")
        .select("*")
        .eq("city_id", city_id)
        .gte("date", str(start_date))
        .lte("date", str(end_date))
        .order("date")
        .execute()
    )

    records = [WeatherDaily(**row) for row in resp.data]
    cache.setex(cache_key, CACHE_TTL, json.dumps([r.model_dump(mode="json") for r in records]))
    return ApiResponse(success=True, data=records)


@router.get("/{city_id}/stats", response_model=ApiResponse[WeatherStats])
def get_weather_stats(
    city_id: int,
    month: str = Query(..., description="Month in YYYY-MM format, e.g. 2024-03"),
):
    """Get aggregated weather statistics for a city in a given month."""
    try:
        year, m = map(int, month.split("-"))
        start_date = datetime.date(year, m, 1)
        end_date = (
            datetime.date(year + 1, 1, 1) if m == 12
            else datetime.date(year, m + 1, 1)
        ) - datetime.timedelta(days=1)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="month must be in YYYY-MM format")

    cache_key = f"stats:{city_id}:{month}"
    cache = get_redis()
    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    resp = (
        db.table("weather_daily")
        .select(
            "temperature_2m_mean, rain_sum, wind_gusts_10m_max, "
            "relative_humidity_2m_mean, wind_speed_10m_mean, cloud_cover_mean"
        )
        .eq("city_id", city_id)
        .gte("date", str(start_date))
        .lte("date", str(end_date))
        .execute()
    )

    if not resp.data:
        raise HTTPException(status_code=404, detail=f"No data for city {city_id} in {month}")

    rows = resp.data
    stats = WeatherStats(
        month=month,
        avg_temperature=_safe_mean([r["temperature_2m_mean"] for r in rows]),
        total_rainfall=round(sum(r["rain_sum"] or 0.0 for r in rows), 2),
        sunny_days_count=sum(
            1 for r in rows
            if (r["rain_sum"] or 0) == 0 and (r["cloud_cover_mean"] or 100) < 30
        ),
        rainy_days_count=sum(1 for r in rows if (r["rain_sum"] or 0) > 1),
        max_wind_gust=_safe_max([r["wind_gusts_10m_max"] for r in rows]),
        avg_humidity=_safe_mean([r["relative_humidity_2m_mean"] for r in rows]),
        avg_wind_speed=_safe_mean([r["wind_speed_10m_mean"] for r in rows]),
    )

    cache.setex(cache_key, CACHE_TTL, stats.model_dump_json())
    return ApiResponse(success=True, data=stats)


@router.get("/{city_id}/advisory", response_model=ApiResponse[AdvisoryResponse])
def get_advisory(city_id: int):
    """Get rule-based weather advisory for a city based on recent 3-day trend."""
    cache_key = f"advisory:{city_id}"
    cache = get_redis()
    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    db = get_supabase()
    
    # Nâng cấp 1: Lấy thêm gió giật, nhiệt độ thấp nhất và lấy 3 ngày (thay vì 1)
    resp = (
        db.table("weather_daily")
        .select("date, temperature_2m_max, temperature_2m_min, rain_sum, wind_speed_10m_max, wind_gusts_10m_max, relative_humidity_2m_mean")
        .eq("city_id", city_id)
        .order("date", desc=True)
        .limit(3)
        .execute()
    )

    if not resp.data:
        raise HTTPException(status_code=404, detail=f"No weather data for city {city_id}")

    # Nâng cấp 2: Phân tích ngày mới nhất & Xu hướng 3 ngày
    today = resp.data[0]
    temp_max = today.get("temperature_2m_max") or 0.0
    temp_min = today.get("temperature_2m_min") or 0.0
    rain = today.get("rain_sum") or 0.0
    wind = today.get("wind_speed_10m_max") or 0.0
    wind_gust = today.get("wind_gusts_10m_max") or 0.0
    humidity = today.get("relative_humidity_2m_mean") or 0.0

    # Tính tổng lượng mưa 3 ngày qua để cảnh báo ngập úng chính xác hơn
    total_rain_3_days = sum(r.get("rain_sum") or 0.0 for r in resp.data)

    # Nâng cấp 3: Bộ rules đánh giá rủi ro (Từ nguy hiểm nhất xuống an toàn nhất)
    if temp_max >= 38:
        advice, risk = "🔴 Nắng nóng gay gắt, nguy cơ sốc nhiệt. Hạn chế ra ngoài từ 10h–16h.", "high"
    elif rain >= 50 or total_rain_3_days >= 100:
        advice, risk = "🔴 Mưa lớn kéo dài, nguy cơ ngập úng cao. Hạn chế di chuyển vào các vùng trũng.", "high"
    elif wind_gust >= 60:
        advice, risk = "🔴 Gió giật mạnh nguy hiểm. Tránh trú dưới cây to hoặc biển quảng cáo.", "high"
    elif temp_min <= 15:
        advice, risk = "🔵 Rét đậm, nhiệt độ xuống thấp. Cần giữ ấm cơ thể, đặc biệt cho người già và trẻ em.", "medium"
    elif humidity >= 90 and temp_min < 22:
        advice, risk = "🌫️ Sương mù dày đặc làm giảm tầm nhìn. Chú ý bật đèn sương mù và giảm tốc độ khi lái xe.", "medium"
    elif rain >= 20:
        advice, risk = "🟡 Mưa vừa đến mưa to. Đừng quên mang theo áo mưa và cẩn thận đường trơn trượt.", "medium"
    elif temp_max >= 35:
        advice, risk = "🟡 Nắng nóng oi bức. Hãy uống đủ nước và che nắng kỹ khi ra ngoài.", "medium"
    elif wind >= 40:
        advice, risk = "🟡 Gió khá mạnh. Cẩn thận khi tham gia giao thông bằng xe máy.", "medium"
    elif humidity >= 85 and rain > 0:
        advice, risk = "🟢 Thời tiết nồm ẩm và có mưa nhỏ. Có thể gây khó chịu, chú ý bảo vệ sức khỏe.", "low"
    else:
        advice, risk = "✅ Thời tiết ôn hòa, rất thuận lợi cho các hoạt động ngoài trời.", "low"

    result = AdvisoryResponse(
        advice_text=advice,
        risk_level=risk,
        based_on={
            "date": today.get("date"),
            "temperature_2m_max": temp_max,
            "temperature_2m_min": temp_min,
            "rain_sum": rain,
            "wind_speed_10m_max": wind,
            "wind_gusts_10m_max": wind_gust,
            "relative_humidity_2m_mean": humidity,
            "total_rain_3_days_trend": total_rain_3_days
        },
    )

    cache.setex(cache_key, ADVISORY_TTL, result.model_dump_json())
    return ApiResponse(success=True, data=result)


# ── Legacy endpoints (backward compatibility) ─────────────────────────────────

@router.get("/{city_id}/latest", response_model=ApiResponse[WeatherCurrentResponse])
def get_latest_weather(city_id: int):
    """Alias for /current — kept for backward compatibility."""
    return get_current_weather(city_id)


@router.get("/{city_id}", response_model=ApiResponse[list[WeatherDaily]])
def get_weather(
    city_id: int,
    start_date: datetime.date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: datetime.date = Query(..., description="End date (YYYY-MM-DD)"),
):
    """Legacy endpoint — prefer /history with the days parameter."""
    if start_date > end_date:
        raise HTTPException(status_code=422, detail="start_date must be before end_date")
    return get_weather_history(city_id, start_date=start_date, end_date=end_date, days=None)
