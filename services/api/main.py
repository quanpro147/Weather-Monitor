from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from services.api.app.routers import summary
from services.api.app.routers import forecast
from services.api.app.core.config import settings
from services.api.app.routers import anomaly, analytics, cities, weather

app = FastAPI(title="Weather Monitor API")

_default_dev_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
]

_env_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]
origins = _env_origins if _env_origins else _default_dev_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(cities.router)
app.include_router(weather.router)
app.include_router(anomaly.router)
app.include_router(summary.router)
app.include_router(forecast.router)
app.include_router(analytics.router)

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
