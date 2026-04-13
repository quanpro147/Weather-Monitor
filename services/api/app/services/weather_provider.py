from __future__ import annotations

import json
from typing import Any
from urllib.parse import urlencode
from urllib.request import urlopen

WEATHER_BASE_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


def _fetch_json(url: str, timeout: int = 6) -> dict[str, Any]:
    with urlopen(url, timeout=timeout) as response:
        payload = response.read().decode("utf-8")
    return json.loads(payload)


def fetch_current_enrichment(latitude: float, longitude: float) -> dict[str, float | None]:
    """Fetch real-time AQI, pressure, visibility and precipitation for coordinates.

    Uses Open-Meteo public APIs (no API key required).
    Returns partial data when one source is unavailable.
    """

    weather_query = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": "pressure_msl,visibility,precipitation",
            "timezone": "auto",
        }
    )
    air_query = urlencode(
        {
            "latitude": latitude,
            "longitude": longitude,
            "current": "european_aqi",
            "timezone": "auto",
        }
    )

    result: dict[str, float | None] = {
        "air_quality_index": None,
        "pressure": None,
        "visibility": None,
        "precipitation": None,
    }

    try:
        weather_payload = _fetch_json(f"{WEATHER_BASE_URL}?{weather_query}")
        current_weather = weather_payload.get("current", {}) if isinstance(weather_payload, dict) else {}

        pressure = current_weather.get("pressure_msl")
        visibility = current_weather.get("visibility")
        precipitation = current_weather.get("precipitation")

        result["pressure"] = float(pressure) if pressure is not None else None
        result["visibility"] = round(float(visibility) / 1000.0, 2) if visibility is not None else None
        result["precipitation"] = float(precipitation) if precipitation is not None else None
    except Exception:
        # Keep nullable fields; caller will use DB fallback values.
        pass

    try:
        air_payload = _fetch_json(f"{AIR_QUALITY_BASE_URL}?{air_query}")
        current_air = air_payload.get("current", {}) if isinstance(air_payload, dict) else {}
        aqi = current_air.get("european_aqi")
        result["air_quality_index"] = float(aqi) if aqi is not None else None
    except Exception:
        pass

    return result
