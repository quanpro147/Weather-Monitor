import datetime

from pydantic import BaseModel, ConfigDict, Field


class AqiRecord(BaseModel):
    """Maps to the AQI data from WAQI API, stored in Supabase."""

    city_id: int
    timestamp: datetime.datetime

    # Overall AQI score (US EPA scale: 0-500)
    aqi: int | None = None

    # Pollutants (μg/m³ unless noted)
    pm25: float | None = Field(None, alias="pm2_5")
    pm10: float | None = None
    o3: float | None = None     # Ozone
    no2: float | None = None    # Nitrogen dioxide
    so2: float | None = None    # Sulfur dioxide
    co: float | None = None     # Carbon monoxide (mg/m³)

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AqiCategory(BaseModel):
    """Human-readable AQI category derived from the AQI score."""

    aqi: int
    category: str
    color: str

    @classmethod
    def from_aqi(cls, aqi: int) -> "AqiCategory":
        if aqi <= 50:
            return cls(aqi=aqi, category="Good", color="green")
        if aqi <= 100:
            return cls(aqi=aqi, category="Moderate", color="yellow")
        if aqi <= 150:
            return cls(aqi=aqi, category="Unhealthy for Sensitive Groups", color="orange")
        if aqi <= 200:
            return cls(aqi=aqi, category="Unhealthy", color="red")
        if aqi <= 300:
            return cls(aqi=aqi, category="Very Unhealthy", color="purple")
        return cls(aqi=aqi, category="Hazardous", color="maroon")
