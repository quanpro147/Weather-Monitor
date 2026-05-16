import logging
import os
import random
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
_MAX_RETRIES = 5
_RETRY_BACKOFF = (1.0, 5.0, 15.0, 30.0, 60.0)

# Open-Meteo free tier: ~10 000 req/day, bursts allowed.
# On 429 we use exponential backoff with jitter instead of a flat 3600s sleep.
# Max wait cap is 300s (5 min) — more than enough for a per-minute limit reset.
_RATE_LIMIT_BASE_WAIT = 30   # seconds for first 429
_RATE_LIMIT_MAX_WAIT  = 300  # hard cap per backoff step
_RATE_LIMIT_MAX_TOTAL = 3    # give up after this many consecutive 429s per city

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Ngày bắt đầu mặc định cho city chưa có data trong DB.
# Chỉ dùng khi city_id không có bất kỳ record nào — không phải khi RPC lỗi.
_DEFAULT_START_DATE = datetime.date(2024, 1, 1)

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
    """
    Lấy MAX(date) per city từ DB qua Supabase RPC.
    Trả về empty dict nếu RPC lỗi — caller phải handle case này
    bằng cách log warning, không được silently fallback về start_date cũ.
    """
    try:
        result = supabase.rpc("get_city_latest_dates", {}).execute()
    except Exception as exc:
        logger.error(
            "RPC get_city_latest_dates failed — cannot determine latest dates. "
            "Ensure the function exists in Supabase (run infra/supabase/schema.sql). Error: %s",
            exc,
        )
        raise  # Propagate — caller should not silently use empty dict as incremental baseline

    if not result.data:
        logger.warning(
            "get_city_latest_dates returned no rows — DB may be empty or RPC returned NULL. "
            "All cities will be fetched from the default start date."
        )
        return {}

    latest: dict[int, datetime.date] = {}
    for row in result.data:
        if row.get("max_date") is None:
            logger.warning("city_id=%s has NULL max_date in RPC result — skipping.", row.get("city_id"))
            continue
        latest[row["city_id"]] = datetime.date.fromisoformat(row["max_date"])

    logger.info("Retrieved latest dates for %d cities from DB.", len(latest))
    return latest


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
    rate_limit_count = 0

    def _jittered_wait(base: float, step: int, cap: float) -> float:
        """Exponential backoff with full jitter: uniform random in [0, min(cap, base * 2^step)]."""
        ceiling = min(cap, base * (2 ** step))
        return random.uniform(0, ceiling)

    while True:
        try:
            response = requests.get(url, params=params, timeout=30)

            if response.status_code == 429:
                rate_limit_count += 1
                if rate_limit_count > _RATE_LIMIT_MAX_TOTAL:
                    logger.error(
                        "Too many rate-limit responses for %s (%d consecutive). Giving up.",
                        city_name, rate_limit_count,
                    )
                    return False

                # Parse reason safely — body may not be JSON (proxy 429s return HTML).
                reason = ""
                try:
                    reason = response.json().get("reason", "")
                except ValueError:
                    pass

                wait = _jittered_wait(_RATE_LIMIT_BASE_WAIT, rate_limit_count - 1, _RATE_LIMIT_MAX_WAIT)
                logger.warning(
                    "Rate limit for %s (attempt %d/%d, reason=%r). Waiting %.0fs...",
                    city_name, rate_limit_count, _RATE_LIMIT_MAX_TOTAL, reason, wait,
                )
                time.sleep(wait)
                # Do NOT reset attempt — rate-limit waits are on top of transient retries.
                continue

            # Reset rate-limit counter on any successful response.
            rate_limit_count = 0
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


def _build_fetch_queue(
    cities_df: pd.DataFrame,
    city_latest_dates: dict[int, datetime.date],
    today: datetime.date,
) -> list[tuple]:
    """
    Trả về danh sách (city_id, city_name, lat, lon, start_date, lag_days) sắp xếp theo:
    1. Incremental (lag 2-365 ngày) — trễ nhất lên đầu, fetch nhanh
    2. Bulk (lag > 365 ngày hoặc chưa có data) — xuống cuối, fetch chậm
    City up-to-date (lag < 2 ngày) bị bỏ qua.
    """
    incremental: list[tuple] = []
    bulk: list[tuple] = []

    for _, row in cities_df.iterrows():
        city_id = int(row["ID"])
        latest_date = city_latest_dates.get(city_id)

        if latest_date is None:
            start_date = _DEFAULT_START_DATE
            lag = (today - start_date).days
            bulk.append((city_id, row["City"], row["Latitude"], row["Longitude"], start_date, lag))
        else:
            lag = (today - latest_date).days
            if lag < 2:
                continue  # up-to-date
            start_date = latest_date + datetime.timedelta(days=1)
            if lag > 365:
                bulk.append((city_id, row["City"], row["Latitude"], row["Longitude"], start_date, lag))
            else:
                incremental.append((city_id, row["City"], row["Latitude"], row["Longitude"], start_date, lag))

    incremental.sort(key=lambda x: x[5], reverse=True)
    bulk.sort(key=lambda x: x[5], reverse=True)
    return incremental + bulk


def main() -> None:
    logger.info("Starting data collection...")

    csv_path = os.path.join(os.path.dirname(__file__), "cities_1500.csv")
    cities_df = pd.read_csv(csv_path)
    total_cities = len(cities_df)

    setup_cities(cities_df)

    end_date = datetime.date.today() - datetime.timedelta(days=1)
    today = datetime.date.today()
    city_latest_dates = get_city_latest_dates()

    _print_date_summary("BEFORE", city_latest_dates, total_cities)

    queue = _build_fetch_queue(cities_df, city_latest_dates, today)
    if not queue:
        logger.info("Data is up to date. Skipping.")
        return

    logger.info(
        "Fetch queue: %d cities to update (incremental first, bulk last).",
        len(queue),
    )

    fetched = 0
    skipped = total_cities - len(queue)
    errors = 0

    for i, (city_id, city_name, lat, lon, start_date, lag_days) in enumerate(queue, 1):
        logger.info(
            "[%d/%d] Fetching %s (%d) from %s to %s (lag %d days)",
            i, len(queue), city_name, city_id, start_date, end_date, lag_days,
        )
        ok = fetch_and_save_city(city_id, city_name, lat, lon, start_date, end_date)
        if ok:
            fetched += 1
        else:
            errors += 1

        # Incremental fetch (small date range) = ít traffic hơn → sleep ngắn hơn.
        sleep_s = 0.3 if lag_days <= 30 else 0.8
        time.sleep(sleep_s)

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
