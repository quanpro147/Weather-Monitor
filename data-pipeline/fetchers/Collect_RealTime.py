import os
import time
import datetime
import pandas as pd
import openmeteo_requests
import requests_cache
from retry_requests import retry
import psycopg2
from psycopg2.extras import execute_values

# Setup DB connection
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Intelligent_Data_Analysis")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "weather")

def get_db_connection():
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        dbname=DB_NAME
    )

def setup_cities(conn, cities_df):
    cursor = conn.cursor()
    cities_data = []
    for _, row in cities_df.iterrows():
        cities_data.append((row['CityId'], row['City'], row['Country'], row['Latitude'], row['Longitude']))
    query = """
        INSERT INTO public.cities (city_id, city, country, latitude, longitude)
        VALUES %s
        ON CONFLICT (city_id) DO NOTHING;
    """
    execute_values(cursor, query, cities_data)
    conn.commit()
    cursor.close()

def main():
    print(f"[{datetime.datetime.now()}] Starting data collection...")
    cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
    retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
    openmeteo = openmeteo_requests.Client(session=retry_session)

    # Đọc file city_id.csv
    csv_path = os.path.join(os.path.dirname(__file__), 'city_id.csv')
    cities_df = pd.read_csv(csv_path)

    conn = get_db_connection()
    setup_cities(conn, cities_df)

    end_date = datetime.date.today() - datetime.timedelta(days=1)
    
    cursor = conn.cursor()
    # Lấy thông tin thời tiết
    for _, row in cities_df.iterrows():
        city_id = row['CityId']
        lat = row['Latitude']
        lon = row['Longitude']

        # Tìm ngày tiếp theo cần lấy dữ liệu cho thành phố này
        cursor.execute("SELECT MAX(date) FROM public.weather_daily WHERE city_id = %s", (city_id,))
        result = cursor.fetchone()[0]
        start_date = (result + datetime.timedelta(days=1)) if result else datetime.date(2017, 1, 1)

        if start_date > end_date:
            print(f"City {row['City']} (ID: {city_id}) is up to date.")
            continue

        print(f"Fetching data for {row['City']} from {start_date} to {end_date}")
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "rain_sum", "shortwave_radiation_sum", "temperature_2m_mean", "wind_direction_10m_dominant", "wind_speed_10m_max", "relative_humidity_2m_mean", "relative_humidity_2m_max", "relative_humidity_2m_min", "wind_gusts_10m_max", "cloud_cover_max", "cloud_cover_min", "cloud_cover_mean", "wind_speed_10m_mean", "wind_gusts_10m_mean"],
            "timezone": "GMT",
        }

        try:
            responses = openmeteo.weather_api(url, params=params)
            response = responses[0]
            daily = response.Daily()

            dates = pd.date_range(
                start=pd.to_datetime(daily.Time(), unit="s", utc=True),
                end=pd.to_datetime(daily.TimeEnd(), unit="s", utc=True),
                freq=pd.Timedelta(seconds=daily.Interval()),
                inclusive="left"
            ).date

            v0 = daily.Variables(0).ValuesAsNumpy()
            v1 = daily.Variables(1).ValuesAsNumpy()
            v2 = daily.Variables(2).ValuesAsNumpy()
            v3 = daily.Variables(3).ValuesAsNumpy()
            v4 = daily.Variables(4).ValuesAsNumpy()
            v5 = daily.Variables(5).ValuesAsNumpy()
            v6 = daily.Variables(6).ValuesAsNumpy()
            v7 = daily.Variables(7).ValuesAsNumpy()
            v8 = daily.Variables(8).ValuesAsNumpy()
            v9 = daily.Variables(9).ValuesAsNumpy()
            v10 = daily.Variables(10).ValuesAsNumpy()
            v11 = daily.Variables(11).ValuesAsNumpy()
            v12 = daily.Variables(12).ValuesAsNumpy()
            v13 = daily.Variables(13).ValuesAsNumpy()
            v14 = daily.Variables(14).ValuesAsNumpy()
            v15 = daily.Variables(15).ValuesAsNumpy()
            v16 = daily.Variables(16).ValuesAsNumpy()

            def c(val):
                if pd.isna(val):
                    return None
                return float(val)

            daily_data = []
            for i in range(len(dates)):
                record = (
                    city_id, dates[i],
                    c(v0[i]), c(v1[i]), c(v2[i]), c(v5[i]), 
                    c(v3[i]), c(v4[i]), c(v6[i]), c(v7[i]),
                    c(v15[i]), c(v11[i]), c(v16[i]), c(v9[i]),
                    c(v10[i]), c(v8[i]), c(v12[i]), c(v13[i]), c(v14[i])
                )
                daily_data.append(record)

            insert_query = """
                INSERT INTO public.weather_daily (
                    city_id, date, weather_code, temperature_2m_max, temperature_2m_min, temperature_2m_mean, 
                    rain_sum, shortwave_radiation_sum, wind_direction_10m_dominant, wind_speed_10m_max, 
                    wind_speed_10m_mean, wind_gusts_10m_max, wind_gusts_10m_mean, relative_humidity_2m_max, 
                    relative_humidity_2m_min, relative_humidity_2m_mean, cloud_cover_max, cloud_cover_min, cloud_cover_mean
                ) VALUES %s
                ON CONFLICT (city_id, date) DO NOTHING;
            """
            execute_values(cursor, insert_query, daily_data)
            conn.commit()
            print(f"Saved {len(daily_data)} records for {row['City']}")
            
        except Exception as e:
            print(f"Error fetching {row['City']}: {e}")
        
        time.sleep(2.5) # Tránh bị rate limit của API (40 req/min)

    cursor.close()
    conn.close()
    print(f"[{datetime.datetime.now()}] Finished data collection.")

if __name__ == "__main__":
    import schedule
    
    # Chạy lần đầu tiên ngay lập tức
    main()
    
    # Cài đặt lịch trình chay mỗi 7 ngày
    schedule.every(7).days.do(main)
    
    print("\nPipeline is now running in real-time mode. It will update data every 7 days.\n")
    while True:
        schedule.run_pending()
        time.sleep(3600)  # Check timer mỗi giờ một lần