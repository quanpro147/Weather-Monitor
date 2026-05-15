import os
import time
import datetime
import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import create_client

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
                        start_date: datetime.date, end_date: datetime.date) -> None:
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "daily": ",".join(DAILY_VARS),
        "timezone": "GMT",
    }

    while True:
        try:
            response = requests.get(url, params=params, timeout=30)

            if response.status_code == 429:
                reason = response.json().get("reason", "")
                wait = 3600 if "Hourly" in reason else 60
                print(f"-> Rate limit. Chờ {wait}s cho {city_name}...")
                time.sleep(wait)
                continue

            response.raise_for_status()
            data = response.json()

            daily = data.get("daily", {})
            dates = daily.get("time", [])
            if not dates:
                print(f"No data for {city_name}")
                return

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

            print(f"Saved {len(records)} records for {city_name}")
            return

        except Exception as e:
            print(f"Error fetching {city_name}: {e}")
            return


def main() -> None:
    print(f"[{datetime.datetime.now()}] Starting data collection...")

    csv_path = os.path.join(os.path.dirname(__file__), "cities_1500.csv")
    cities_df = pd.read_csv(csv_path)

    setup_cities(cities_df)

    end_date = datetime.date.today() - datetime.timedelta(days=1)
    city_latest_dates = get_city_latest_dates()

    needs_update = any(
        not city_latest_dates.get(int(row["ID"])) or
        (datetime.date.today() - city_latest_dates[int(row["ID"])]).days >= 2
        for _, row in cities_df.iterrows()
    )

    if not needs_update:
        print(f"[{datetime.datetime.now()}] Dữ liệu đã mới nhất. Bỏ qua.")
        return

    for _, row in cities_df.iterrows():
        city_id = int(row["ID"])
        latest_date = city_latest_dates.get(city_id)

        if latest_date:
            if (datetime.date.today() - latest_date).days < 2:
                continue
            start_date = latest_date + datetime.timedelta(days=1)
        else:
            start_date = datetime.date(2020, 1, 1)

        print(f"Fetching {row['City']} from {start_date} to {end_date}")
        fetch_and_save_city(city_id, row["City"], row["Latitude"], row["Longitude"],
                            start_date, end_date)
        time.sleep(0.8)

    print(f"[{datetime.datetime.now()}] Finished data collection.")


if __name__ == "__main__":
    import schedule
    main()

    schedule.every(1).days.do(main)
    print("\nPipeline running. Kiểm tra mỗi ngày.\n")
    while True:
        schedule.run_pending()
        time.sleep(3600)
