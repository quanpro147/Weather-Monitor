"""
One-time backfill: fetch historical AQI for all weather_daily rows where aqi IS NULL.

Run once after the aqi column migration:
    python data-pipeline/fetchers/backfill_aqi.py
"""

import datetime
import logging
import os
import time

import requests
from dotenv import load_dotenv
from supabase import create_client, Client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

load_dotenv()

_AQI_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
_BATCH_SIZE = 500


def _make_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def _fetch_aqi_daily(
    lat: float, lon: float,
    start_date: datetime.date, end_date: datetime.date,
) -> dict[str, int]:
    """
    Fetch daily mean AQI (European AQI scale) from Open-Meteo Air Quality API.
    Aggregates hourly european_aqi into per-day integer means.
    Returns empty dict on any failure.
    """
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "european_aqi",
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "timezone": "GMT",
    }
    try:
        resp = requests.get(_AQI_URL, params=params, timeout=30)
        resp.raise_for_status()
        hourly = resp.json().get("hourly", {})
        times = hourly.get("time", [])
        aqi_vals = hourly.get("european_aqi", [])

        daily: dict[str, list[int]] = {}
        for t, val in zip(times, aqi_vals):
            if val is not None:
                daily.setdefault(t[:10], []).append(int(val))

        return {d: min(round(sum(v) / len(v)), 500) for d, v in daily.items()}
    except Exception as exc:
        logger.warning("AQI fetch failed lat=%.4f lon=%.4f: %s", lat, lon, exc)
        return {}


def _get_cities_needing_backfill(client: Client) -> list[dict]:
    result = client.rpc("get_cities_needing_aqi_backfill").range(0, 9999).execute()
    return result.data or []


def _update_aqi_batch(client: Client, rows: list[tuple]) -> int:
    """
    rows = list of (aqi_int, city_id, date_str)
    Calls the update_aqi_batch SQL function in batches of _BATCH_SIZE.
    Returns total rows updated.
    """
    total = 0
    for i in range(0, len(rows), _BATCH_SIZE):
        chunk = rows[i : i + _BATCH_SIZE]
        payload = [
            {"city_id": city_id, "date": date_str, "aqi": aqi_val}
            for aqi_val, city_id, date_str in chunk
        ]
        result = client.rpc("update_aqi_batch", {"updates": payload}).execute()
        total += result.data or 0
    return total


def main() -> None:
    client = _make_client()

    logger.info("Querying cities with missing AQI data...")
    cities = _get_cities_needing_backfill(client)

    if not cities:
        logger.info("All AQI values already filled. Nothing to do.")
        return

    total_cities = len(cities)
    total_null = sum(c["null_count"] for c in cities)
    logger.info(
        "Found %d cities with %d NULL aqi rows. Starting backfill...",
        total_cities, total_null,
    )

    total_updated = 0
    total_skipped = 0

    for i, city in enumerate(cities, 1):
        city_id   = city["city_id"]
        city_name = city["city"]
        lat        = float(city["latitude"])
        lon        = float(city["longitude"])
        start_date = datetime.date.fromisoformat(city["min_date"])
        end_date   = datetime.date.fromisoformat(city["max_date"])

        logger.info(
            "[%d/%d] %s (id=%d): %s → %s (%d null rows)",
            i, total_cities, city_name, city_id, start_date, end_date, city["null_count"],
        )

        aqi_by_date = _fetch_aqi_daily(lat, lon, start_date, end_date)
        if not aqi_by_date:
            logger.warning("No AQI data for %s — skipping.", city_name)
            total_skipped += 1
            time.sleep(0.3)
            continue

        rows = [
            (aqi_val, city_id, date_str)
            for date_str, aqi_val in aqi_by_date.items()
            if aqi_val is not None
        ]

        if rows:
            updated = _update_aqi_batch(client, rows)
            total_updated += updated
            logger.info("  → updated %d rows", updated)
        else:
            logger.warning("  → fetch returned no usable values for %s", city_name)
            total_skipped += 1

        time.sleep(0.3)

    logger.info(
        "Backfill complete — cities: %d, rows updated: %d, skipped: %d",
        total_cities, total_updated, total_skipped,
    )


if __name__ == "__main__":
    main()
