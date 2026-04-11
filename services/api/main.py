from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import anomaly, cities, weather

app = FastAPI(title="Weather Monitor API")

_dev_origins = ["http://localhost:3000"]
_prod_origins = ["https://weather-monitor.vercel.app"]  # TODO: cập nhật domain thật khi deploy

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
