import datetime

from pydantic import BaseModel


class AnomalyRecord(BaseModel):
    """A single daily weather record annotated with anomaly detection results."""

    date: datetime.date
    anomaly_score: float   # higher = more anomalous
    is_anomaly: bool

    # Key features returned for frontend context
    temperature_2m_max: float | None = None
    temperature_2m_min: float | None = None
    temperature_2m_mean: float | None = None
    rain_sum: float | None = None
    wind_speed_10m_max: float | None = None
    relative_humidity_2m_mean: float | None = None
    cloud_cover_mean: float | None = None
