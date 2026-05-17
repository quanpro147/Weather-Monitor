-- Bảng lưu thông tin các thành phố
CREATE TABLE IF NOT EXISTS public.cities (
    city_id INTEGER PRIMARY KEY,
    city    VARCHAR(255) NOT NULL,
    country VARCHAR(255) NOT NULL,
    latitude  DECIMAL(10, 7) NOT NULL CHECK (latitude  BETWEEN -90.0  AND  90.0),
    longitude DECIMAL(10, 7) NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0)
);

-- Bảng lưu thông tin thời tiết hằng ngày
CREATE TABLE IF NOT EXISTS public.weather_daily (
    id      SERIAL  PRIMARY KEY,
    city_id INTEGER NOT NULL REFERENCES public.cities(city_id) ON DELETE CASCADE,
    date    DATE    NOT NULL,

    weather_code               INTEGER,

    -- Nhiệt độ (°C): phạm vi thực tế tại Việt Nam / Đông Nam Á
    temperature_2m_max         DECIMAL(5, 2) CHECK (temperature_2m_max  BETWEEN -20.0 AND 55.0),
    temperature_2m_min         DECIMAL(5, 2) CHECK (temperature_2m_min  BETWEEN -20.0 AND 55.0),
    temperature_2m_mean        DECIMAL(5, 2) CHECK (temperature_2m_mean BETWEEN -20.0 AND 55.0),

    -- Mưa (mm) và bức xạ (MJ/m²)
    rain_sum                   DECIMAL(8, 2) CHECK (rain_sum                 BETWEEN 0.0 AND 1500.0),
    shortwave_radiation_sum    DECIMAL(8, 2) CHECK (shortwave_radiation_sum  BETWEEN 0.0 AND   40.0),

    -- Gió: hướng (°), tốc độ và giật (km/h)
    wind_direction_10m_dominant DECIMAL(5, 2) CHECK (wind_direction_10m_dominant BETWEEN 0.0 AND 360.0),
    wind_speed_10m_max         DECIMAL(5, 2) CHECK (wind_speed_10m_max   BETWEEN 0.0 AND 200.0),
    wind_speed_10m_mean        DECIMAL(5, 2) CHECK (wind_speed_10m_mean  BETWEEN 0.0 AND 200.0),
    wind_gusts_10m_max         DECIMAL(5, 2) CHECK (wind_gusts_10m_max   BETWEEN 0.0 AND 300.0),
    wind_gusts_10m_mean        DECIMAL(5, 2) CHECK (wind_gusts_10m_mean  BETWEEN 0.0 AND 300.0),

    -- Độ ẩm (%)
    relative_humidity_2m_max   DECIMAL(5, 2) CHECK (relative_humidity_2m_max  BETWEEN 0.0 AND 100.0),
    relative_humidity_2m_min   DECIMAL(5, 2) CHECK (relative_humidity_2m_min  BETWEEN 0.0 AND 100.0),
    relative_humidity_2m_mean  DECIMAL(5, 2) CHECK (relative_humidity_2m_mean BETWEEN 0.0 AND 100.0),

    -- Mây che phủ (%)
    cloud_cover_max            DECIMAL(5, 2) CHECK (cloud_cover_max  BETWEEN 0.0 AND 100.0),
    cloud_cover_min            DECIMAL(5, 2) CHECK (cloud_cover_min  BETWEEN 0.0 AND 100.0),
    cloud_cover_mean           DECIMAL(5, 2) CHECK (cloud_cover_mean BETWEEN 0.0 AND 100.0),

    -- Chất lượng không khí (European AQI scale, 0–500)
    aqi                        SMALLINT      CHECK (aqi BETWEEN 0 AND 500),

    UNIQUE (city_id, date)
);

-- Index để truy vấn nhanh hơn
CREATE INDEX IF NOT EXISTS idx_weather_daily_city_id_date
    ON public.weather_daily (city_id, date);

-- ── Migrations: áp dụng lên DB đã tồn tại ────────────────────────────────────
-- Các lệnh dưới đây an toàn để chạy lại (idempotent).

-- 1. city_id NOT NULL
ALTER TABLE public.weather_daily ALTER COLUMN city_id SET NOT NULL;

-- 2. CHECK constraints (bỏ qua nếu đã tồn tại)
DO $$
BEGIN
    -- cities: lat/lon range
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cities_latitude_check'   AND conrelid = 'public.cities'::regclass) THEN
        ALTER TABLE public.cities ADD CONSTRAINT cities_latitude_check  CHECK (latitude  BETWEEN -90.0  AND  90.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cities_longitude_check'  AND conrelid = 'public.cities'::regclass) THEN
        ALTER TABLE public.cities ADD CONSTRAINT cities_longitude_check CHECK (longitude BETWEEN -180.0 AND 180.0);
    END IF;

    -- weather_daily: temperature
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_temp_max'  AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_temp_max  CHECK (temperature_2m_max  IS NULL OR temperature_2m_max  BETWEEN -20.0 AND 55.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_temp_min'  AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_temp_min  CHECK (temperature_2m_min  IS NULL OR temperature_2m_min  BETWEEN -20.0 AND 55.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_temp_mean' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_temp_mean CHECK (temperature_2m_mean IS NULL OR temperature_2m_mean BETWEEN -20.0 AND 55.0);
    END IF;

    -- weather_daily: rain & radiation
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_rain_sum' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_rain_sum CHECK (rain_sum IS NULL OR rain_sum BETWEEN 0.0 AND 1500.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_radiation' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_radiation CHECK (shortwave_radiation_sum IS NULL OR shortwave_radiation_sum BETWEEN 0.0 AND 40.0);
    END IF;

    -- weather_daily: wind
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wind_dir' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_wind_dir CHECK (wind_direction_10m_dominant IS NULL OR wind_direction_10m_dominant BETWEEN 0.0 AND 360.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wind_speed_max'  AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_wind_speed_max  CHECK (wind_speed_10m_max  IS NULL OR wind_speed_10m_max  BETWEEN 0.0 AND 200.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wind_speed_mean' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_wind_speed_mean CHECK (wind_speed_10m_mean IS NULL OR wind_speed_10m_mean BETWEEN 0.0 AND 200.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wind_gusts_max'  AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_wind_gusts_max  CHECK (wind_gusts_10m_max  IS NULL OR wind_gusts_10m_max  BETWEEN 0.0 AND 300.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wind_gusts_mean' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_wind_gusts_mean CHECK (wind_gusts_10m_mean IS NULL OR wind_gusts_10m_mean BETWEEN 0.0 AND 300.0);
    END IF;

    -- weather_daily: humidity
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_humidity_max'  AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_humidity_max  CHECK (relative_humidity_2m_max  IS NULL OR relative_humidity_2m_max  BETWEEN 0.0 AND 100.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_humidity_min'  AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_humidity_min  CHECK (relative_humidity_2m_min  IS NULL OR relative_humidity_2m_min  BETWEEN 0.0 AND 100.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_humidity_mean' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_humidity_mean CHECK (relative_humidity_2m_mean IS NULL OR relative_humidity_2m_mean BETWEEN 0.0 AND 100.0);
    END IF;

    -- weather_daily: cloud cover
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cloud_max'  AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_cloud_max  CHECK (cloud_cover_max  IS NULL OR cloud_cover_max  BETWEEN 0.0 AND 100.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cloud_min'  AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_cloud_min  CHECK (cloud_cover_min  IS NULL OR cloud_cover_min  BETWEEN 0.0 AND 100.0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_cloud_mean' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_cloud_mean CHECK (cloud_cover_mean IS NULL OR cloud_cover_mean BETWEEN 0.0 AND 100.0);
    END IF;

    -- weather_daily: aqi
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_aqi' AND conrelid = 'public.weather_daily'::regclass) THEN
        ALTER TABLE public.weather_daily ADD CONSTRAINT chk_aqi CHECK (aqi IS NULL OR aqi BETWEEN 0 AND 500);
    END IF;
END $$;

-- ── RPC functions ────────────────────────────────────────────────────────────
-- Trả về MAX(date) cho mỗi city — dùng bởi pipeline để chỉ fetch ngày còn thiếu.
CREATE OR REPLACE FUNCTION public.get_city_latest_dates()
RETURNS TABLE(city_id INTEGER, max_date DATE)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT city_id, MAX(date)::DATE AS max_date
    FROM public.weather_daily
    GROUP BY city_id;
$$;

-- ── Data retention policy ─────────────────────────────────────────────────────
-- Keep rolling 900 days (~2.5 years) so year-over-year comparison is always available.
-- One-time cleanup: DELETE FROM public.weather_daily WHERE date < '2024-01-01';
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'weather-data-retention',
    '0 3 * * *',
    $$DELETE FROM public.weather_daily WHERE date < CURRENT_DATE - INTERVAL '900 days'$$
);
