import os
import time
import datetime
import pandas as pd
import requests
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Nạp các biến môi trường từ file .env (nếu có lúc chạy ở ngoài Docker)
load_dotenv()

# Setup DB connection — all required, no defaults for credentials
DB_USER = os.environ["DB_USER"]
DB_PASSWORD = os.environ["DB_PASSWORD"]
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.environ["DB_NAME"]

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
        cities_data.append((row['ID'], row['City'], 'Vietnam', row['Latitude'], row['Longitude']))
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
    
    # Đọc file VietNam.csv
    csv_path = os.path.join(os.path.dirname(__file__), 'cities_1500.csv')
    cities_df = pd.read_csv(csv_path)

    conn = get_db_connection()
    setup_cities(conn, cities_df)
    end_date = datetime.date.today() - datetime.timedelta(days=1)
    cursor = conn.cursor()
    cursor.execute("SELECT city_id, MAX(date) FROM public.weather_daily GROUP BY city_id")
    city_latest_dates = {row[0]: row[1] for row in cursor.fetchall()}
    
    needs_update = False
    for _, row in cities_df.iterrows():
        city_id = int(row['ID'])
        latest_date = city_latest_dates.get(city_id)
        if not latest_date or (datetime.date.today() - latest_date).days >= 2:
            needs_update = True
            break
            
    if not needs_update:
        print(f"[{datetime.datetime.now()}] Dữ liệu đã là mới nhất (chênh lệch < 2 ngày). Tạm hoãn chạy để chờ lần sau!")
        cursor.close()
        conn.close()
        return
    
    print("Checking which cities need updates...")

    # Lấy thông tin thời tiết
    for _, row in cities_df.iterrows():
        city_id = int(row['ID'])
        lat = row['Latitude']
        lon = row['Longitude']
        latest_date = city_latest_dates.get(city_id)
        if latest_date:
            days_diff = (datetime.date.today() - latest_date).days
            # Chỉ lấy thêm data cho thành phố nào trễ từ 2 ngày trở lên
            if days_diff < 2:
                continue
            start_date = latest_date + datetime.timedelta(days=1)
        else:
            # Chưa từng có data -> lấy từ đầu 2020
            start_date = datetime.date(2025, 1, 1)

        print(f"Fetching data for {row['City']} from {start_date} to {end_date}")
        url = "https://archive-api.open-meteo.com/v1/archive"
        
        daily_vars = [
            "weather_code", "temperature_2m_max", "temperature_2m_min", "rain_sum", 
            "shortwave_radiation_sum", "temperature_2m_mean", "wind_direction_10m_dominant", 
            "wind_speed_10m_max", "relative_humidity_2m_mean", "relative_humidity_2m_max", 
            "relative_humidity_2m_min", "wind_gusts_10m_max", "cloud_cover_max", 
            "cloud_cover_min", "cloud_cover_mean", "wind_speed_10m_mean", "wind_gusts_10m_mean"
        ]

        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "daily": ",".join(daily_vars),
            "timezone": "GMT",
        }

        while True:
            try:
                response = requests.get(url, params=params)
                
                if response.status_code == 429:
                    error_data = response.json()
                    reason = error_data.get('reason', '')
                    if 'Hourly' in reason:
                        print(f"-> Hourly API limit exceeded. Tự động chờ 60 phút để tải lại {row['City']}...")
                        time.sleep(3600)
                        continue
                    else:
                        print(f"-> Minutely API limit exceeded. Tự động chờ 60 giây để tải lại {row['City']}...")
                        time.sleep(60)
                        continue
                
                response.raise_for_status()
                data = response.json()
                
                if "daily" not in data:
                    print(f"No data found for {row['City']}. Response: {data}")
                    break
                    
                daily = data.get('daily', {})
                dates = daily.get('time', [])
                
                if not dates:
                    print(f"Empty dates for {row['City']}")
                    break

                def c(val):
                    if val is None or pd.isna(val):
                        return None
                    return float(val)

                daily_data = []
                for i in range(len(dates)):
                    def get_val(key, idx):
                        arr = daily.get(key, [])
                        return arr[idx] if idx < len(arr) else None
                    wc = get_val('weather_code', i)
                    record = (
                        city_id,
                        dates[i],
                        int(wc) if wc is not None else None,
                        c(get_val('temperature_2m_max', i)), 
                        c(get_val('temperature_2m_min', i)), 
                        c(get_val('temperature_2m_mean', i)), 
                        c(get_val('rain_sum', i)), 
                        c(get_val('shortwave_radiation_sum', i)), 
                        c(get_val('wind_direction_10m_dominant', i)), 
                        c(get_val('wind_speed_10m_max', i)),
                        c(get_val('wind_speed_10m_mean', i)), 
                        c(get_val('wind_gusts_10m_max', i)), 
                        c(get_val('wind_gusts_10m_mean', i)), 
                        c(get_val('relative_humidity_2m_max', i)),
                        c(get_val('relative_humidity_2m_min', i)), 
                        c(get_val('relative_humidity_2m_mean', i)), 
                        c(get_val('cloud_cover_max', i)), 
                        c(get_val('cloud_cover_min', i)), 
                        c(get_val('cloud_cover_mean', i))
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
                break
                
            except Exception as e:
                print(f"Error fetching {row['City']}: {str(e)}")
                if 'response' in locals() and hasattr(response, 'text'):
                    print(f"Chi tiết lỗi API: {response.text}")
                break
            
        time.sleep(0.8) 

    cursor.close()
    conn.close()
    print(f"[{datetime.datetime.now()}] Finished data collection.")

if __name__ == "__main__":
    import schedule
    main()
    
    schedule.every(1).days.do(main)
    print("\nPipeline is now running. Lịch trình sẽ tự kiểm tra mỗi ngày (đủ trễ 2 ngày mới lấy data).\n")
    while True:
        schedule.run_pending()
        time.sleep(3600)  