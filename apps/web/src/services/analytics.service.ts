import { api, requireSuccessData } from './api';
import type { ApiResponse } from '../types/common';
import type {
	ClusteringData,
	CrossCityData,
	ExtremesData,
	HistogramData,
	ScopeMode,
} from '../types/analytics';

export async function getExtremes(scopeMode: ScopeMode = 'vietnam'): Promise<ExtremesData> {
	const response = await api.get<ApiResponse<ExtremesData>>('/analytics/extremes', {
		scope_mode: scopeMode,
	});
	return requireSuccessData(response, 'Failed to load extremes data');
}

export async function getCrossCity(scopeMode: ScopeMode = 'vietnam'): Promise<CrossCityData> {
	const response = await api.get<ApiResponse<CrossCityData>>('/analytics/cross-city', {
		scope_mode: scopeMode,
	});
	return requireSuccessData(response, 'Failed to load cross-city data');
}

export async function getHistogram(
	scopeMode: ScopeMode = 'vietnam',
	binWidth: number = 2.0,
): Promise<HistogramData> {
	const response = await api.get<ApiResponse<HistogramData>>('/analytics/histogram', {
		scope_mode: scopeMode,
		bin_width: binWidth,
	});
	return requireSuccessData(response, 'Failed to load histogram data');
}

export async function getClustering(
	scopeMode: ScopeMode = 'vietnam',
	k: number = 3,
): Promise<ClusteringData> {
	const response = await api.get<ApiResponse<ClusteringData>>('/analytics/clustering', {
		scope_mode: scopeMode,
		k,
	});
	return requireSuccessData(response, 'Failed to load clustering data');
}
