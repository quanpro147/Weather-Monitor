import datetime
from pydantic import BaseModel

class ForecastPoint(BaseModel):
    """Điểm dữ liệu dự báo nhiệt độ trong tương lai"""
    date: datetime.date
    predicted_temperature: float

class ForecastResponse(BaseModel):
    city_id: int
    forecast_days: int
    trends: list[ForecastPoint]