from pydantic import BaseModel

class SummaryResponse(BaseModel):
    """Phản hồi từ AI tóm tắt tình hình thời tiết"""
    city_name: str
    summary_text: str
    provider: str  # Để biết là dùng Gemini hay OpenAI