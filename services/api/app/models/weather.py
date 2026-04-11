import datetime
from typing import Any, Literal

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


class WeatherStats(BaseModel):
    """Aggregated statistics for a city in a given month."""

    month: str                          # YYYY-MM
    avg_temperature: float | None       # °C mean
    total_rainfall: float               # mm total
    sunny_days_count: int               # rain=0 + cloud_cover_mean < 30%
    rainy_days_count: int               # rain_sum > 1mm
    max_wind_gust: float | None         # km/h
    avg_humidity: float | None          # %
    avg_wind_speed: float | None        # km/h


class AdvisoryResponse(BaseModel):
    """Rule-based weather advisory for a city."""

    advice_text: str
    risk_level: Literal["low", "medium", "high"]
    based_on: dict[str, Any]            # weather snapshot used for the decision


class CityWeatherCompare(BaseModel):
    """Latest weather snapshot for one city — used in multi-city comparison."""

    city_id: int
    city_name: str
    date: datetime.date | None = None
    temperature_2m_mean: float | None = None
    temperature_2m_max: float | None = None
    rain_sum: float | None = None
    wind_speed_10m_max: float | None = None
    weather_code: int | None = None


class ExtremeResult(BaseModel):
    """City with the highest temperature or rainfall in a date range."""

    city_id: int
    city_name: str
    value: float
    type: str                           # "hottest" | "rainiest"
    date: datetime.date
