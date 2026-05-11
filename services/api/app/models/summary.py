from pydantic import BaseModel

class SummaryResponse(BaseModel):
    """Phản hồi từ AI tóm tắt tình hình thời tiết"""
    city_name: str
    summary_text: str
    provider: str
    period_days: int = 0
    anomaly_count: int = 0
    trend_direction: str = "stable"
