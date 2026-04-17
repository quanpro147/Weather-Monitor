import type { ApiResponse, ISODateString } from './common';

export interface AnomalyRecord {
	date: ISODateString;
	anomaly_score: number;
	is_anomaly: boolean;
	temperature_2m_max: number | null;
	temperature_2m_min: number | null;
	temperature_2m_mean: number | null;
	rain_sum: number | null;
	wind_speed_10m_max: number | null;
	relative_humidity_2m_mean: number | null;
	cloud_cover_mean: number | null;
}

export interface GetAnomaliesParams {
	start_date: ISODateString;
	end_date: ISODateString;
}

export type GetAnomaliesResponse = ApiResponse<AnomalyRecord[]>;
