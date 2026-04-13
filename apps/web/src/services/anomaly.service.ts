import { api, requireSuccessData } from './api';
import type { AnomalyRecord, GetAnomaliesParams, GetAnomaliesResponse } from '../types/anomaly';

export async function getAnomalies(cityId: number, params: GetAnomaliesParams): Promise<AnomalyRecord[]> {
	const response = await api.get<GetAnomaliesResponse>(`/anomaly/${cityId}`, {
		start_date: params.start_date,
		end_date: params.end_date,
	});

	return requireSuccessData(response, `Failed to load anomaly data for city ${cityId}`);
}
