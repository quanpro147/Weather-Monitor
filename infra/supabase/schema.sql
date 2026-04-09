-- Bảng lưu thông tin các thành phố
CREATE TABLE IF NOT EXISTS public.cities (
    city_id INTEGER PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL
);

-- Bảng lưu thông tin thời tiết hằng ngày
CREATE TABLE IF NOT EXISTS public.weather_daily (
    id SERIAL PRIMARY KEY,
    city_id INTEGER REFERENCES public.cities(city_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weather_code INTEGER,
    temperature_2m_max DECIMAL(5, 2),
    temperature_2m_min DECIMAL(5, 2),
    temperature_2m_mean DECIMAL(5, 2),
    rain_sum DECIMAL(8, 2),
    shortwave_radiation_sum DECIMAL(8, 2),
    wind_direction_10m_dominant DECIMAL(5, 2),
    wind_speed_10m_max DECIMAL(5, 2),
    wind_speed_10m_mean DECIMAL(5, 2),
    wind_gusts_10m_max DECIMAL(5, 2),
    wind_gusts_10m_mean DECIMAL(5, 2),
    relative_humidity_2m_max DECIMAL(5, 2),
    relative_humidity_2m_min DECIMAL(5, 2),
    relative_humidity_2m_mean DECIMAL(5, 2),
    cloud_cover_max DECIMAL(5, 2),
    cloud_cover_min DECIMAL(5, 2),
    cloud_cover_mean DECIMAL(5, 2),
    UNIQUE(city_id, date) -- Đảm bảo không bị trùng lặp dữ liệu trong một ngày tại một khu vực
);

-- Index để truy vấn nhanh hơn
CREATE INDEX IF NOT EXISTS idx_weather_daily_city_id_date ON public.weather_daily(city_id, date);