export type ScopeMode = 'vietnam' | 'global';

// ── /analytics/extremes ───────────────────────────────────────────────────────

export interface ExtremeEntry {
	city: string;
	value: number;
	date: string;
}

export interface ExtremesData {
	hottest: ExtremeEntry;
	rainiest: ExtremeEntry;
	worst_aqi: ExtremeEntry;
}

// ── /analytics/cross-city ─────────────────────────────────────────────────────

export interface CrossCityEntry {
	city: string;
	temp: number | null;
	aqi: number | null;
	rain: number | null;
}

export interface CrossCityData {
	scope_mode: ScopeMode;
	cities: CrossCityEntry[];
}

// ── /analytics/histogram ─────────────────────────────────────────────────────

export interface HistogramBin {
	bin: string;
	count: number;
}

export interface HistogramData {
	scope_mode: ScopeMode;
	metric: string;
	bins: HistogramBin[];
}

// ── /analytics/clustering ────────────────────────────────────────────────────

export interface ClusterPoint {
	city: string;
	temp: number;
	aqi: number;
	rain: number;
	cluster: number;
}

export interface ClusterProfile {
	id: number;
	name: string;
	color: string;
	colorLight: string;
	desc: string;
}

export interface ClusteringMeta {
	source_rows: number;
	rows_after_dropna: number;
	features: string[];
	scaler: string;
	algorithm: string;
}

export interface ClusteringData {
	scope_mode: ScopeMode;
	k: number;
	points: ClusterPoint[];
	profiles: ClusterProfile[];
	meta: ClusteringMeta;
}
