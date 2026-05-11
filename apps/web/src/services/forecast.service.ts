import { api, requireSuccessData } from './api';

export interface ForecastPoint {
	date: string;
	predicted_temperature: number;
	confidence_lower: number;
	confidence_upper: number;
	method: string;
}

interface ForecastPayload {
	city_id: number;
	forecast_days: number;
	trends: ForecastPoint[];
}

type ForecastApiResponse = {
	success: boolean;
	data: ForecastPayload | null;
	error: string | null;
};

export async function getForecast(cityId: number, days = 7): Promise<ForecastPoint[]> {
	const response = await api.get<ForecastApiResponse>(`/forecast/${cityId}`, { days });
	const payload = requireSuccessData(response, `Failed to load forecast for city ${cityId}`);
	return payload.trends ?? [];
}
