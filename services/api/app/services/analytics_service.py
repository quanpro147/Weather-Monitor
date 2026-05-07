"""
Analytics service implementation blueprint.

Purpose
-------
Centralize all analytics/data-mining logic here so routers stay thin.
This module should own:
- data extraction shaping for analytics use-cases
- cleaning + feature engineering
- unsupervised learning (K-Means)
- histogram/summary aggregations


RECOMMENDED FUNCTIONS
=====================
1) fetch_city_feature_rows(scope_mode: str) -> list[dict]
   - Query Supabase tables for city + latest weather metrics.
   - Return rows with at least:
	 city_id, city, country, temperature, aqi, rain

2) build_kmeans_clusters(scope_mode: str, k: int) -> dict
   Steps:
   a) rows = fetch_city_feature_rows(scope_mode)
   b) df = pd.DataFrame(rows)
   c) df = df.dropna(subset=["temperature", "aqi", "rain"])
   d) scaler = StandardScaler(); X = scaler.fit_transform(df[[...features...]])
   e) model = KMeans(n_clusters=k, random_state=42, n_init="auto")
   f) labels = model.fit_predict(X)
   g) attach labels to rows and format points[]
   h) construct profiles[] (either static semantic mapping or computed descriptors)
   i) return payload dict expected by router response model

3) build_temperature_histogram(scope_mode: str, bins: int | list[float]) -> list[dict]
   - Use numpy.histogram or pandas.cut
   - Return [{"bin": "20-22°C", "count": 5}, ...]


PSEUDOCODE EXAMPLE
==================
def build_kmeans_clusters(scope_mode: str, k: int) -> dict:
	rows = fetch_city_feature_rows(scope_mode)
	if not rows:
		raise ValueError("No source rows")

	df = pd.DataFrame(rows)
	features = ["temperature", "aqi", "rain"]
	df_clean = df.dropna(subset=features).copy()

	if len(df_clean) < k:
		raise ValueError("Not enough rows after DropNaN for requested k")

	scaler = StandardScaler()
	X = scaler.fit_transform(df_clean[features])

	model = KMeans(n_clusters=k, random_state=42, n_init="auto")
	df_clean["cluster"] = model.fit_predict(X)

	points = [
		{
			"city": r["city"],
			"temp": float(r["temperature"]),
			"aqi": float(r["aqi"]),
			"rain": float(r["rain"]),
			"cluster": int(r["cluster"]),
		}
		for _, r in df_clean.iterrows()
	]

	profiles = infer_or_map_cluster_profiles(df_clean)

	return {
		"scope_mode": scope_mode,
		"k": k,
		"points": points,
		"profiles": profiles,
		"meta": {
			"source_rows": len(df),
			"rows_after_dropna": len(df_clean),
			"features": features,
			"scaler": "StandardScaler",
			"algorithm": "KMeans",
		},
	}


STATE/API CONSUMPTION NOTE FOR BACKEND TEAM
===========================================
Frontend EDA should consume this service via:
- apps/web/src/services/api.ts (shared API client)
- SWR hooks (recommended) for cache + revalidation

This means backend should provide:
- stable response keys
- deterministic types
- clear HTTP errors with actionable messages


TESTING CHECKLIST
=================
- scope_mode=vietnam returns points > 0
- scope_mode=global still works with missing rain/aqi rows dropped
- k greater than valid rows returns 400-safe message
- cluster label is int and temp/aqi/rain are numeric
- response aligns with FE ClusteringChart contract
"""
