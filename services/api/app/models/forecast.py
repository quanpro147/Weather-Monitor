import datetime
from pydantic import BaseModel


class ForecastPoint(BaseModel):
    date: datetime.date
    predicted_temperature: float
    confidence_lower: float = 0.0
    confidence_upper: float = 0.0
    method: str = "arima"


class ForecastResponse(BaseModel):
    city_id: int
    forecast_days: int
    trends: list[ForecastPoint]
