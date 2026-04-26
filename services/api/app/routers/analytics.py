"""
Analytics router implementation guide for backend team.

Context
-------
Frontend pages/components already shipped:
- /analytics page
- EdaView tiered layout (Extremes, Cross-City, Histogram, Clustering)
- ClusteringChart expects K-Means style feature-space payload.

Current goal
------------
Implement NEW endpoint:
GET /analytics/clustering?scope_mode=vietnam&k=3

Why this matters
----------------
Frontend is moving from static mock data to backend-driven Data Mining UX.
If response contract is stable, FE only swaps data source, no layout rewrite.


RECOMMENDED ROUTER SHAPE
========================
1) File-level imports (when implementing):
	 - fastapi: APIRouter, Query, HTTPException
	 - pydantic models (response schema)
	 - analytics_service functions
	 - ApiResponse wrapper from app.models.common

2) Router declaration:
	 router = APIRouter(prefix="/analytics", tags=["analytics"])

3) Main endpoint to add:

	 @router.get("/clustering", response_model=ApiResponse[ClusteringResponse])
	 def get_clustering(
			 scope_mode: str = Query("vietnam", pattern="^(vietnam|global)$"),
			 k: int = Query(3, ge=2, le=8),
	 ):
			 # call analytics_service.build_kmeans_clusters(...)
			 # return ApiResponse(success=True, data=...)


PIPELINE REQUIRED BY PRODUCT SPEC
=================================
Input query
-----------
- scope_mode: "vietnam" | "global"
- k: number of clusters (default 3)

Processing steps
----------------
1. Pull latest weather features for cities in selected scope_mode.
	 Minimum fields per row:
	 - city_id
	 - city (name)
	 - country
	 - temperature (or temperature_2m_mean fallback)
	 - aqi (or enrichment equivalent)
	 - rain (or rain_sum)

2. Drop rows with missing values on required feature columns.
	 - Must drop NaN/null for temperature, aqi, rain.
	 - Return 400 if not enough usable rows for requested k.

3. Standardize features via StandardScaler.
	 - Features: [temperature, aqi, rain]

4. Run KMeans(n_clusters=k, random_state=42, n_init="auto").

5. Attach cluster labels back to city rows and return JSON.


RESPONSE CONTRACT FOR FRONTEND
==============================
Return shape should map 1:1 to ClusteringChart props/state.

Suggested response payload (inside ApiResponse.data):
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

Notes:
- FE needs points[].city/temp/aqi/rain/cluster exactly.
- profiles can come from backend to keep semantics centralized.
- Color can be backend-defined or FE-defined, but choose one source of truth.


ERROR HANDLING GUIDELINES
=========================
- 400: invalid scope_mode, invalid k, not enough valid rows after DropNaN.
- 500: unexpected DB/ML runtime errors.
- Keep ApiResponse(error=...) consistent with other routers.


PERF/CACHE GUIDELINES
=====================
- Add Redis cache key suggestion:
	analytics:clustering:{scope_mode}:k={k}:date={today}
- TTL 10-30 min is acceptable for dashboard interaction.


FRONTEND INTEGRATION NOTE (for backend awareness)
==================================================
Frontend service layer uses apps/web/src/services/api.ts as the only API client.
State fetch strategy should use SWR (same as summary panel) for:
- cache + dedupe + stale-while-revalidate
- easy retry behavior

Once endpoint is ready, FE will:
- add analytics.service.ts -> getClustering(...)
- useSWR key like: analytics:clustering:{scope_mode}:{k}
- render points/profiles directly in ClusteringChart.


CHECKLIST BEFORE MERGE
======================
- Implement router + pydantic models + service function
- Register router in services/api/main.py
- Validate JSON contract against FE expected keys
- Verify CORS/dev URL already works via existing middleware
"""
