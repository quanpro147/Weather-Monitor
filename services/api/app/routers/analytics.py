import json
import datetime

from fastapi import APIRouter, HTTPException, Query

from services.api.app.core.cache import get_redis
from services.api.app.models.analytics import (
    ClusteringResponse,
    CrossCityResponse,
    ExtremesResponse,
    HistogramResponse,
)
from services.api.app.models.common import ApiResponse
from services.api.app.services import analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])

CACHE_TTL = 900  # 15 min


def _scope_query(scope_mode: str = Query("vietnam", pattern="^(vietnam|global)$")) -> str:
    return scope_mode


# ── /extremes ─────────────────────────────────────────────────────────────────

@router.get("/extremes", response_model=ApiResponse[ExtremesResponse])
def get_extremes(
    scope_mode: str = Query("vietnam", pattern="^(vietnam|global)$"),
):
    today = datetime.date.today().isoformat()
    cache_key = f"analytics:extremes:{scope_mode}:date={today}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    try:
        payload = analytics_service.build_extremes(scope_mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")

    cache.setex(cache_key, CACHE_TTL, json.dumps(payload))
    return ApiResponse(success=True, data=payload)


# ── /cross-city ───────────────────────────────────────────────────────────────

@router.get("/cross-city", response_model=ApiResponse[CrossCityResponse])
def get_cross_city(
    scope_mode: str = Query("vietnam", pattern="^(vietnam|global)$"),
):
    today = datetime.date.today().isoformat()
    cache_key = f"analytics:cross-city:{scope_mode}:date={today}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    try:
        payload = analytics_service.build_cross_city(scope_mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")

    cache.setex(cache_key, CACHE_TTL, json.dumps(payload))
    return ApiResponse(success=True, data=payload)


# ── /histogram ────────────────────────────────────────────────────────────────

@router.get("/histogram", response_model=ApiResponse[HistogramResponse])
def get_histogram(
    scope_mode: str = Query("vietnam", pattern="^(vietnam|global)$"),
    bin_width: float = Query(2.0, ge=0.5, le=10.0, description="Bin width in °C"),
):
    today = datetime.date.today().isoformat()
    cache_key = f"analytics:histogram:{scope_mode}:bw={bin_width}:date={today}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    try:
        payload = analytics_service.build_temperature_histogram(scope_mode, bin_width=bin_width)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")

    cache.setex(cache_key, CACHE_TTL, json.dumps(payload))
    return ApiResponse(success=True, data=payload)


# ── /clustering ───────────────────────────────────────────────────────────────

@router.get("/clustering", response_model=ApiResponse[ClusteringResponse])
def get_clustering(
    scope_mode: str = Query("vietnam", pattern="^(vietnam|global)$"),
    k: int = Query(3, ge=2, le=8, description="Number of clusters"),
):
    today = datetime.date.today().isoformat()
    cache_key = f"analytics:clustering:{scope_mode}:k={k}:date={today}"
    cache = get_redis()

    cached = cache.get(cache_key)
    if isinstance(cached, str):
        return ApiResponse(success=True, data=json.loads(cached))

    try:
        payload = analytics_service.build_kmeans_clusters(scope_mode, k)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Internal error: {exc}")

    cache.setex(cache_key, CACHE_TTL, json.dumps(payload))
    return ApiResponse(success=True, data=payload)
