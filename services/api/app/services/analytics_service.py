from __future__ import annotations

import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from services.api.app.core.cache import get_redis
from services.api.app.core.database import get_supabase
from services.api.app.services.weather_provider import fetch_current_enrichment

VIETNAM_COUNTRY = "Viet Nam"
FEATURE_COLS = ["temperature", "aqi", "rain"]
AQI_CACHE_TTL = 900
WEATHER_LOOKBACK_DAYS = 30
AQI_FETCH_WORKERS = 16
AQI_FETCH_TIMEOUT = 4

_CLUSTER_COLORS = [
    ("#ef4444", "#fca5a5"),
    ("#3b82f6", "#93c5fd"),
    ("#f97316", "#fdba74"),
    ("#22c55e", "#86efac"),
    ("#a855f7", "#d8b4fe"),
    ("#14b8a6", "#5eead4"),
    ("#f59e0b", "#fde68a"),
    ("#6366f1", "#a5b4fc"),
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _country_for_scope(scope_mode: str) -> str | None:
    return VIETNAM_COUNTRY if scope_mode == "vietnam" else None


def _fetch_cities(scope_mode: str) -> list[dict]:
    db = get_supabase()
    query = db.table("cities").select("city_id, city, country, latitude, longitude")
    country = _country_for_scope(scope_mode)
    if country:
        query = query.eq("country", country)
    return query.execute().data


def _fetch_latest_weather(city_ids: list[int]) -> dict[int, dict]:
    """Return latest weather_daily row per city_id within the last WEATHER_LOOKBACK_DAYS."""
    db = get_supabase()
    cutoff = (datetime.date.today() - datetime.timedelta(days=WEATHER_LOOKBACK_DAYS)).isoformat()
    rows = (
        db.table("weather_daily")
        .select("city_id, date, temperature_2m_mean, rain_sum, temperature_2m_max")
        .in_("city_id", city_ids)
        .gte("date", cutoff)
        .order("date", desc=True)
        .execute()
        .data
    )
    latest: dict[int, dict] = {}
    for row in rows:
        cid = row["city_id"]
        if cid not in latest:
            latest[cid] = row
    return latest


def _fetch_aqi_batch(city_rows: list[dict]) -> dict[int, float | None]:
    """Fetch AQI for each city from Open-Meteo, using Redis cache where available."""
    cache = get_redis()
    result: dict[int, float | None] = {}
    to_fetch: list[dict] = []

    for row in city_rows:
        cached = cache.get(f"analytics:aqi:{row['city_id']}")
        if cached is not None:
            result[row["city_id"]] = float(cached) if cached != "null" else None
        else:
            to_fetch.append(row)

    def _fetch_one(row: dict) -> tuple[int, float | None]:
        try:
            enrichment = fetch_current_enrichment(row["latitude"], row["longitude"], timeout=AQI_FETCH_TIMEOUT)
            return row["city_id"], enrichment.get("air_quality_index")
        except Exception:
            return row["city_id"], None

    with ThreadPoolExecutor(max_workers=AQI_FETCH_WORKERS) as pool:
        futures = [pool.submit(_fetch_one, row) for row in to_fetch]
        for future in as_completed(futures):
            city_id, aqi = future.result()
            result[city_id] = aqi
            cache.setex(f"analytics:aqi:{city_id}", AQI_CACHE_TTL, str(aqi) if aqi is not None else "null")

    return result


def fetch_city_feature_rows(scope_mode: str) -> list[dict]:
    """Return merged rows: city + latest weather from DB + real-time AQI."""
    cities = _fetch_cities(scope_mode)
    if not cities:
        return []

    city_ids = [c["city_id"] for c in cities]
    city_map = {c["city_id"]: c for c in cities}
    latest_weather = _fetch_latest_weather(city_ids)
    aqi_map = _fetch_aqi_batch(cities)

    rows = []
    for city_id, city_data in city_map.items():
        weather = latest_weather.get(city_id)
        rows.append({
            "city_id": city_id,
            "city": city_data["city"],
            "country": city_data["country"],
            "temperature": weather.get("temperature_2m_mean") if weather else None,
            "temperature_max": weather.get("temperature_2m_max") if weather else None,
            "rain": weather.get("rain_sum") if weather else None,
            "aqi": aqi_map.get(city_id),
            "date": weather.get("date") if weather else None,
        })
    return rows


# ── Profile generation ────────────────────────────────────────────────────────

def _tier_labels(values: np.ndarray, labels: tuple[str, str, str]) -> list[str]:
    if values.size == 0:
        return []
    if np.allclose(values, values[0]):
        return [labels[1]] * len(values)

    q1, q2 = np.quantile(values, [0.33, 0.66])
    result: list[str] = []
    for value in values:
        if value <= q1:
            result.append(labels[0])
        elif value <= q2:
            result.append(labels[1])
        else:
            result.append(labels[2])
    return result


def _build_cluster_profiles(centroids: np.ndarray) -> list[dict]:
    temps = centroids[:, 0]
    aqis = centroids[:, 1]
    rains = centroids[:, 2]

    temp_labels = _tier_labels(temps, ("Cool", "Warm", "Hot"))
    air_labels = _tier_labels(aqis, ("Clean Air", "Moderate Air", "Polluted Air"))

    base_names: list[str] = []
    profiles: list[dict] = []
    for cluster_id, (temp_label, air_label) in enumerate(zip(temp_labels, air_labels)):
        rain = rains[cluster_id]
        if rain > 15:
            rain_suffix = " & Rainy"
        elif rain < 10:
            rain_suffix = " & Dry"
        else:
            rain_suffix = " & Balanced"

        base_name = f"{temp_label}, {air_label}{rain_suffix}"
        base_names.append(base_name)

        color, color_light = _CLUSTER_COLORS[cluster_id % len(_CLUSTER_COLORS)]
        profiles.append({
            "id": cluster_id,
            "name": base_name,
            "color": color,
            "colorLight": color_light,
            "desc": f"Avg temp {temps[cluster_id]:.1f}°C, AQI {aqis[cluster_id]:.0f}, rain {rains[cluster_id]:.1f} mm.",
        })

    name_counts: dict[str, int] = {}
    for name in base_names:
        name_counts[name] = name_counts.get(name, 0) + 1

    duplicates = {name for name, count in name_counts.items() if count > 1}
    if duplicates:
        for duplicate_name in duplicates:
            indices = [i for i, name in enumerate(base_names) if name == duplicate_name]
            sorted_indices = sorted(indices, key=lambda idx: rains[idx])
            for position, idx in enumerate(sorted_indices):
                if len(sorted_indices) == 2:
                    suffix = " (Lower Rain)" if position == 0 else " (Higher Rain)"
                else:
                    if position == 0:
                        suffix = " (Lower Rain)"
                    elif position == len(sorted_indices) - 1:
                        suffix = " (Higher Rain)"
                    else:
                        suffix = " (Moderate Rain)"
                profiles[idx]["name"] = f"{profiles[idx]['name']}{suffix}"

    return profiles


# ── Public service functions ──────────────────────────────────────────────────

def build_extremes(scope_mode: str) -> dict:
    rows = fetch_city_feature_rows(scope_mode)
    if not rows:
        raise ValueError("No data found for scope")

    today = datetime.date.today().isoformat()

    valid_temp = [r for r in rows if r["temperature_max"] is not None]
    valid_rain = [r for r in rows if r["rain"] is not None]
    valid_aqi = [r for r in rows if r["aqi"] is not None]

    if not valid_temp or not valid_rain or not valid_aqi:
        raise ValueError("Insufficient data to compute extremes")

    hottest = max(valid_temp, key=lambda r: r["temperature_max"])
    rainiest = max(valid_rain, key=lambda r: r["rain"])
    worst = max(valid_aqi, key=lambda r: r["aqi"])

    return {
        "hottest": {
            "city": hottest["city"],
            "value": round(float(hottest["temperature_max"]), 1),
            "date": hottest["date"] or today,
        },
        "rainiest": {
            "city": rainiest["city"],
            "value": round(float(rainiest["rain"]), 1),
            "date": rainiest["date"] or today,
        },
        "worst_aqi": {
            "city": worst["city"],
            "value": round(float(worst["aqi"]), 0),
            "date": today,
        },
    }


def build_cross_city(scope_mode: str) -> dict:
    rows = fetch_city_feature_rows(scope_mode)
    if not rows:
        raise ValueError("No data found for scope")

    cities = [
        {
            "city": r["city"],
            "temp": round(float(r["temperature"]), 1) if r["temperature"] is not None else None,
            "aqi": round(float(r["aqi"]), 1) if r["aqi"] is not None else None,
            "rain": round(float(r["rain"]), 1) if r["rain"] is not None else None,
        }
        for r in rows
    ]
    cities.sort(key=lambda c: c["city"])

    return {"scope_mode": scope_mode, "cities": cities}


def build_temperature_histogram(scope_mode: str, bin_width: float = 2.0) -> dict:
    rows = fetch_city_feature_rows(scope_mode)
    if not rows:
        raise ValueError("No data found for scope")

    temps = [r["temperature"] for r in rows if r["temperature"] is not None]
    if not temps:
        raise ValueError("No temperature data available")

    arr = np.array(temps, dtype=float)
    t_min = float(np.floor(arr.min() / bin_width) * bin_width)
    t_max = float(np.ceil(arr.max() / bin_width) * bin_width) + bin_width
    edges = np.arange(t_min, t_max + bin_width, bin_width)
    counts, bin_edges = np.histogram(arr, bins=edges)

    bins = [
        {"bin": f"{bin_edges[i]:.0f}-{bin_edges[i+1]:.0f}°C", "count": int(counts[i])}
        for i in range(len(counts))
        if counts[i] > 0
    ]

    return {"scope_mode": scope_mode, "metric": "temperature", "bins": bins}


def build_kmeans_clusters(scope_mode: str, k: int) -> dict:
    rows = fetch_city_feature_rows(scope_mode)
    if not rows:
        raise ValueError("No data found for scope")

    df = pd.DataFrame(rows)
    source_rows = len(df)

    df_clean = df.dropna(subset=FEATURE_COLS).copy()
    rows_after_dropna = len(df_clean)

    if rows_after_dropna < k:
        raise ValueError(
            f"Only {rows_after_dropna} valid rows after dropping NaN — not enough for k={k} clusters"
        )

    scaler = StandardScaler()
    X = scaler.fit_transform(df_clean[FEATURE_COLS].astype(float))

    model = KMeans(n_clusters=k, random_state=42, n_init="auto")
    df_clean = df_clean.copy()
    df_clean["cluster"] = model.fit_predict(X)

    centroids_scaled = model.cluster_centers_
    centroids = scaler.inverse_transform(centroids_scaled)

    points = [
        {
            "city": row["city"],
            "temp": round(float(row["temperature"]), 1),
            "aqi": round(float(row["aqi"]), 1),
            "rain": round(float(row["rain"]), 1),
            "cluster": int(row["cluster"]),
        }
        for _, row in df_clean.iterrows()
    ]

    profiles = _build_cluster_profiles(centroids)

    return {
        "scope_mode": scope_mode,
        "k": k,
        "points": points,
        "profiles": profiles,
        "meta": {
            "source_rows": source_rows,
            "rows_after_dropna": rows_after_dropna,
            "features": FEATURE_COLS,
            "scaler": "StandardScaler",
            "algorithm": "KMeans",
        },
    }
