import logging
import os
import time
import datetime
import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import create_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_TRANSIENT_ERRORS = (
    requests.exceptions.ConnectionError,
    requests.exceptions.Timeout,
    requests.exceptions.ChunkedEncodingError,
)
_MAX_RETRIES = 3
_RETRY_BACKOFF = (1.0, 5.0, 15.0)

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DAILY_VARS = [
    "weather_code", "temperature_2m_max", "temperature_2m_min", "rain_sum",
    "shortwave_radiation_sum", "temperature_2m_mean", "wind_direction_10m_dominant",
    "wind_speed_10m_max", "relative_humidity_2m_mean", "relative_humidity_2m_max",
    "relative_humidity_2m_min", "wind_gusts_10m_max", "cloud_cover_max",
    "cloud_cover_min", "cloud_cover_mean", "wind_speed_10m_mean", "wind_gusts_10m_mean"
]


def setup_cities(cities_df: pd.DataFrame) -> None:
    cities_data = []
    for _, row in cities_df.iterrows():
        country = row.get("Country", "Viet Nam")
        if pd.isna(country):
            country = "Viet Nam"
        cities_data.append({
            "city_id": int(row["ID"]),
            "city": row["City"],
            "country": str(country),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
        })
    supabase.table("cities").upsert(cities_data, on_conflict="city_id").execute()
    logger.info("Upserted %d cities", len(cities_data))


def get_city_latest_dates() -> dict[int, datetime.date]:
    # Dùng RPC để GROUP BY city_id lấy MAX(date) — hiệu quả hơn lấy toàn bảng
    result = supabase.rpc("get_city_latest_dates", {}).execute()
    if result.data:
        return {row["city_id"]: datetime.date.fromisoformat(row["max_date"]) for row in result.data}
    return {}


def _float(val) -> float | None:
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    return float(val)


def fetch_and_save_city(city_id: int, city_name: str, lat: float, lon: float,
                        start_date: datetime.date, end_date: datetime.date) -> bool:
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": ",".join(DAILY_VARS),
        "timezone": "GMT",
    }

    attempt = 0
    while True:
        try:
            response = requests.get(url, params=params, timeout=30)

            if response.status_code == 429:
                reason = response.json().get("reason", "")
                wait = 3600 if "Hourly" in reason else 60
                logger.warning("Rate limit for %s. Waiting %ds...", city_name, wait)
                time.sleep(wait)
                attempt = 0  # rate-limit sleep is not a retry — reset counter
                continue

            response.raise_for_status()
            data = response.json()

            daily = data.get("daily", {})
            dates = daily.get("time", [])
            if not dates:
                logger.warning("No data returned for %s (%s – %s)", city_name, start_date, end_date)
                return False

            def get_val(key: str, idx: int):
                arr = daily.get(key, [])
                return arr[idx] if idx < len(arr) else None

            records = []
            for i, date_str in enumerate(dates):
                wc = get_val("weather_code", i)
                records.append({
                    "city_id": city_id,
                    "date": date_str,
                    "weather_code": int(wc) if wc is not None else None,
                    "temperature_2m_max": _float(get_val("temperature_2m_max", i)),
                    "temperature_2m_min": _float(get_val("temperature_2m_min", i)),
                    "temperature_2m_mean": _float(get_val("temperature_2m_mean", i)),
                    "rain_sum": _float(get_val("rain_sum", i)),
                    "shortwave_radiation_sum": _float(get_val("shortwave_radiation_sum", i)),
                    "wind_direction_10m_dominant": _float(get_val("wind_direction_10m_dominant", i)),
                    "wind_speed_10m_max": _float(get_val("wind_speed_10m_max", i)),
                    "wind_speed_10m_mean": _float(get_val("wind_speed_10m_mean", i)),
                    "wind_gusts_10m_max": _float(get_val("wind_gusts_10m_max", i)),
                    "wind_gusts_10m_mean": _float(get_val("wind_gusts_10m_mean", i)),
                    "relative_humidity_2m_max": _float(get_val("relative_humidity_2m_max", i)),
                    "relative_humidity_2m_min": _float(get_val("relative_humidity_2m_min", i)),
                    "relative_humidity_2m_mean": _float(get_val("relative_humidity_2m_mean", i)),
                    "cloud_cover_max": _float(get_val("cloud_cover_max", i)),
                    "cloud_cover_min": _float(get_val("cloud_cover_min", i)),
                    "cloud_cover_mean": _float(get_val("cloud_cover_mean", i)),
                })

            # Upsert theo batch 500 records
            batch_size = 500
            for i in range(0, len(records), batch_size):
                supabase.table("weather_daily").upsert(
                    records[i:i + batch_size],
                    on_conflict="city_id,date"
                ).execute()

            logger.info("Saved %d records for %s", len(records), city_name)
            return True

        except _TRANSIENT_ERRORS as e:
            if attempt < _MAX_RETRIES - 1:
                wait = _RETRY_BACKOFF[attempt]
                logger.warning(
                    "Transient error for %s (attempt %d/%d), retrying in %.0fs: %s",
                    city_name, attempt + 1, _MAX_RETRIES, wait, e,
                )
                time.sleep(wait)
                attempt += 1
            else:
                logger.error("Giving up on %s after %d attempts: %s", city_name, _MAX_RETRIES, e)
                return False

        except requests.exceptions.HTTPError as e:
            logger.error("HTTP error for %s [%d]: %s", city_name, response.status_code, e)
            return False

        except (ValueError, KeyError) as e:
            logger.error("Data parsing error for %s: %s", city_name, e)
            return False


def _print_date_summary(label: str, city_latest_dates: dict[int, datetime.date], total_cities: int) -> None:
    from collections import Counter
    date_counts: Counter = Counter(city_latest_dates.values())
    no_data = total_cities - len(city_latest_dates)
    print(f"\n{'='*50}")
    print(f"[{label}] Date distribution across {total_cities} cities:")
    for d, count in sorted(date_counts.items(), reverse=True):
        print(f"  {d}  →  {count} cities")
    if no_data > 0:
        print(f"  (no data)  →  {no_data} cities")
    if date_counts:
        print(f"  Latest date in DB: {max(date_counts.keys())}")
    print('='*50)


def main() -> None:
    logger.info("Starting data collection...")

    csv_path = os.path.join(os.path.dirname(__file__), "cities_1500.csv")
    cities_df = pd.read_csv(csv_path)
    total_cities = len(cities_df)

    setup_cities(cities_df)

    end_date = datetime.date.today() - datetime.timedelta(days=1)
    city_latest_dates = get_city_latest_dates()

    _print_date_summary("BEFORE", city_latest_dates, total_cities)

    needs_update = any(
        not city_latest_dates.get(int(row["ID"])) or
        (datetime.date.today() - city_latest_dates[int(row["ID"])]).days >= 2
        for _, row in cities_df.iterrows()
    )

    if not needs_update:
        logger.info("Data is up to date. Skipping.")
        return

    fetched = 0
    skipped = 0
    errors = 0

    for _, row in cities_df.iterrows():
        city_id = int(row["ID"])
        latest_date = city_latest_dates.get(city_id)

        if latest_date:
            if (datetime.date.today() - latest_date).days < 2:
                skipped += 1
                continue
            start_date = latest_date + datetime.timedelta(days=1)
        else:
            start_date = datetime.date(2024, 1, 1)

        logger.info("Fetching %s (%d) from %s to %s", row["City"], city_id, start_date, end_date)
        ok = fetch_and_save_city(city_id, row["City"], row["Latitude"], row["Longitude"],
                                 start_date, end_date)
        if ok:
            fetched += 1
        else:
            errors += 1
        time.sleep(0.8)

    logger.info("Run summary: fetched=%d, skipped=%d, errors=%d", fetched, skipped, errors)

    final_dates = get_city_latest_dates()
    _print_date_summary("AFTER", final_dates, total_cities)

    logger.info("Finished data collection.")


if __name__ == "__main__":
    import schedule
    main()

    schedule.every(1).days.do(main)
    print("\nPipeline running. Kiểm tra mỗi ngày.\n")
    while True:
        schedule.run_pending()
        time.sleep(3600)
