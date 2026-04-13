import { api, requireSuccessData } from './api';
import type {
	AdvisoryApiResponse,
	AdvisoryResponse,
	CityWeatherCompare,
	CompareCitiesResponse,
	ExtremeResult,
	WeatherDaily,
	WeatherExtremesParams,
	WeatherExtremesResponse,
	WeatherHistoryParams,
	WeatherHistoryResponse,
	WeatherStats,
	WeatherStatsResponse,
} from '../types/weather';

type CurrentWeatherResponse = { success: boolean; data: WeatherDaily | null; error: string | null };

export async function getCurrentWeather(cityId: number): Promise<WeatherDaily> {
	const response = await api.get<CurrentWeatherResponse>(`/weather/${cityId}/current`);
	return requireSuccessData(response, `Failed to load current weather for city ${cityId}`);
}

export async function getWeatherHistory(cityId: number, params: WeatherHistoryParams): Promise<WeatherDaily[]> {
	const response = await api.get<WeatherHistoryResponse>(`/weather/${cityId}/history`, {
		start_date: params.start_date,
		end_date: params.end_date,
		days: params.days,
	});
	return requireSuccessData(response, `Failed to load weather history for city ${cityId}`);
}

export async function getWeatherStats(cityId: number, month: string): Promise<WeatherStats> {
	const response = await api.get<WeatherStatsResponse>(`/weather/${cityId}/stats`, { month });
	return requireSuccessData(response, `Failed to load weather stats for city ${cityId}`);
}

export async function getWeatherAdvisory(cityId: number): Promise<AdvisoryResponse> {
	const response = await api.get<AdvisoryApiResponse>(`/weather/${cityId}/advisory`);
	return requireSuccessData(response, `Failed to load weather advisory for city ${cityId}`);
}

export async function compareCities(cityIds: number[]): Promise<CityWeatherCompare[]> {
	const response = await api.get<CompareCitiesResponse>('/weather/compare', {
		// Backend expects comma-separated values.
		city_ids: cityIds.join(','),
	});
	return requireSuccessData(response, 'Failed to compare cities');
}

export async function getWeatherExtremes(params: WeatherExtremesParams): Promise<ExtremeResult> {
	const response = await api.get<WeatherExtremesResponse>('/weather/extremes', {
		type: params.type,
		start_date: params.start_date,
		end_date: params.end_date,
	});
	return requireSuccessData(response, 'Failed to load weather extremes');
}
