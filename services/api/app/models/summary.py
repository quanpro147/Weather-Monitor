"""
Pydantic models for the /summary endpoint.
Add confidence_level, confidence_score, confidence_reason to SummaryResponse.
"""

from typing import Literal
from pydantic import BaseModel


class SummaryResponse(BaseModel):
    city_name: str
    summary_text: str
    provider: str
    period_days: int
    anomaly_count: int
    trend_direction: Literal["warming", "cooling", "stable"]

    # ── Confidence metadata (new) ──────────────────────────────────────────────
    confidence_level: Literal["high", "medium", "low"] = "medium"
    confidence_score: int = 50          # 0–100
    confidence_reason: str = ""         # human-readable explanation