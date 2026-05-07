from pydantic import BaseModel


class ClusterPoint(BaseModel):
    city: str
    temp: float
    aqi: float
    rain: float
    cluster: int


class ClusterProfile(BaseModel):
    id: int
    name: str
    color: str
    colorLight: str
    desc: str


class ClusteringMeta(BaseModel):
    source_rows: int
    rows_after_dropna: int
    features: list[str]
    scaler: str
    algorithm: str


class ClusteringResponse(BaseModel):
    scope_mode: str
    k: int
    points: list[ClusterPoint]
    profiles: list[ClusterProfile]
    meta: ClusteringMeta


class ExtremeEntry(BaseModel):
    city: str
    value: float
    date: str


class ExtremesResponse(BaseModel):
    hottest: ExtremeEntry
    rainiest: ExtremeEntry
    worst_aqi: ExtremeEntry


class CrossCityEntry(BaseModel):
    city: str
    temp: float | None
    aqi: float | None
    rain: float | None


class CrossCityResponse(BaseModel):
    scope_mode: str
    cities: list[CrossCityEntry]


class HistogramBin(BaseModel):
    bin: str
    count: int


class HistogramResponse(BaseModel):
    scope_mode: str
    metric: str
    bins: list[HistogramBin]
