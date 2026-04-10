import datetime

from pydantic import BaseModel, ConfigDict


class WeatherDaily(BaseModel):
    """Maps to the `weather_daily` table in Supabase."""

    city_id: int
    date: datetime.date

    # Temperature (°C)
    temperature_2m_max: float | None = None
    temperature_2m_min: float | None = None
    temperature_2m_mean: float | None = None

    # Precipitation
    rain_sum: float | None = None                       # mm
    shortwave_radiation_sum: float | None = None        # MJ/m²

    # Wind
    wind_speed_10m_max: float | None = None             # km/h
    wind_speed_10m_mean: float | None = None            # km/h
    wind_gusts_10m_max: float | None = None             # km/h
    wind_gusts_10m_mean: float | None = None            # km/h
    wind_direction_10m_dominant: float | None = None    # degrees

    # Humidity (%)
    relative_humidity_2m_max: float | None = None
    relative_humidity_2m_min: float | None = None
    relative_humidity_2m_mean: float | None = None

    # Cloud cover (%)
    cloud_cover_max: float | None = None
    cloud_cover_min: float | None = None
    cloud_cover_mean: float | None = None

    # WMO weather code
    weather_code: int | None = None

    model_config = ConfigDict(from_attributes=True)
