from fastapi import FastAPI

from app.routers import cities, weather

app = FastAPI(title="Weather Monitor API")

app.include_router(cities.router)
app.include_router(weather.router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
