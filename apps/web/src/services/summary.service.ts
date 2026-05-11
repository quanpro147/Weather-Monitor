import { api, requireSuccessData } from './api';

export interface SummaryPayload {
	city_name: string;
	summary_text: string;
	provider: string;
	period_days: number;
	anomaly_count: number;
	trend_direction: 'warming' | 'cooling' | 'stable';
}

type SummaryApiResponse = {
	success: boolean;
	data: SummaryPayload | null;
	error: string | null;
};

export async function getWeatherSummary(cityId: number): Promise<SummaryPayload> {
	const response = await api.get<SummaryApiResponse>(`/summary/${cityId}`);
	return requireSuccessData(response, `Failed to load AI summary for city ${cityId}`);
}
