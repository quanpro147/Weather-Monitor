from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from services.api.app.core.config import settings
from services.api.app.routers import anomaly, cities, weather

app = FastAPI(title="Weather Monitor API")

_default_dev_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

_prod_origins = ["https://weather-monitor.vercel.app"]  # TODO: cập nhật domain thật khi deploy

_env_origins = os.getenv("FRONTEND_ORIGINS", "")
_dev_origins = [o.strip() for o in _env_origins.split(",") if o.strip()] or _default_dev_origins

origins = _dev_origins if settings.app_env == "development" else _prod_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(cities.router)
app.include_router(weather.router)
app.include_router(anomaly.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
