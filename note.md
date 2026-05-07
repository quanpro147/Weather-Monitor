# Analytics Backend Integration Guide

This document explains what backend needs to implement so frontend `/analytics` can switch from mock data to live API data without UI rewrites.

## 1. Frontend Context (already built)

Frontend has these analytics sections:
- Tier 1: Extremes cards
- Tier 2: Cross-city bar chart + histogram
- Tier 3: Clustering scatter + xAI cluster profiling

Main files:
- `apps/web/src/pages/analytics.tsx`
- `apps/web/src/components/features/data-analytics/EdaView.tsx`
- `apps/web/src/components/features/data-analytics/ClusteringChart.tsx`

Current data in FE is mock/static. Goal: replace with FastAPI responses.

## 2. Required New Endpoint

Implement in `services/api/app/routers/analytics.py`:

- `GET /analytics/clustering?scope_mode=vietnam&k=3`

Query params:
- `scope_mode`: `vietnam | global`
- `k`: number of clusters (suggest range 2..8)

## 3. Required Processing Pipeline (FastAPI + Pandas + scikit-learn)

1. Pull latest city-weather rows for selected scope.
2. Drop rows with NaN in `[temperature, aqi, rain]`.
3. Standardize features with `StandardScaler`.
4. Run `KMeans(n_clusters=k)`.
5. Return cluster label per city in response payload.

## 4. Response Contract (must match FE keys)

Use existing `ApiResponse` envelope and return this in `data`:

```json
{
	"scope_mode": "vietnam",
	"k": 3,
	"points": [
		{
			"city": "Ha Noi",
			"temp": 16.0,
			"aqi": 185.0,
			"rain": 20.0,
			"cluster": 0
		}
	],
	"profiles": [
		{
			"id": 0,
			"name": "Cluster 0: Cold & High Pollution",
			"color": "#ef4444",
			"desc": "Cities sharing severe winter smog patterns."
		}
	],
	"meta": {
		"source_rows": 125,
		"rows_after_dropna": 117,
		"features": ["temperature", "aqi", "rain"],
		"scaler": "StandardScaler",
		"algorithm": "KMeans"
	}
}
```

Important: FE `ClusteringChart.tsx` expects:
- `points[].city`
- `points[].temp`
- `points[].aqi`
- `points[].rain` (optional but preferred)
- `points[].cluster` (integer label)

## 5. Router Registration

After creating router:
1. Import analytics router in `services/api/main.py`
2. Add `app.include_router(analytics.router)`

Without this step endpoint will not be reachable from FE.

## 6. Error Handling

Use consistent error behavior:
- `400`: invalid params or not enough rows after DropNaN for requested `k`
- `404`: no data found for scope
- `500`: unexpected runtime errors

Always return clear message in `ApiResponse.error`.

## 7. Caching Recommendation

Add Redis key:
- `analytics:clustering:{scope_mode}:k={k}:date={yyyy-mm-dd}`

Suggested TTL:
- 10-30 minutes for dashboard responsiveness.

## 8. FE State Management + API Tooling (for backend awareness)

Frontend stack for this page should use:
- Shared API client: `apps/web/src/services/api.ts`
- SWR for data state and revalidation

Why SWR:
- built-in cache
- dedupe requests
- stale-while-revalidate behavior

Expected FE pattern:
1. `analytics.service.ts` calls `GET /analytics/clustering`
2. Hook uses SWR key `analytics:clustering:{scope_mode}:{k}`
3. UI reads `data.points` + `data.profiles`

## 9. Suggested Next Endpoints (optional but aligned)

To fully de-mock EDA page later:
- `GET /analytics/extremes`
- `GET /analytics/cross-city`
- `GET /analytics/histogram`

Keep contracts stable and typed to avoid FE regressions.

