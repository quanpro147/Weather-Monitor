import type { ApiResponse, ISODateString } from './common';

export type RiskLevel = 'low' | 'medium' | 'high';
export type ExtremeType = 'hottest' | 'rainiest';

export interface WeatherDaily {
	city_id: number;
	date: ISODateString;
	temperature_2m_max: number | null;
	temperature_2m_min: number | null;
	temperature_2m_mean: number | null;
	rain_sum: number | null;
	shortwave_radiation_sum: number | null;
	wind_speed_10m_max: number | null;
	wind_speed_10m_mean: number | null;
	wind_gusts_10m_max: number | null;
	wind_gusts_10m_mean: number | null;
	wind_direction_10m_dominant: number | null;
	relative_humidity_2m_max: number | null;
	relative_humidity_2m_min: number | null;
	relative_humidity_2m_mean: number | null;
	cloud_cover_max: number | null;
	cloud_cover_min: number | null;
	cloud_cover_mean: number | null;
	weather_code: number | null;
}

export interface WeatherStats {
	month: string;
	avg_temperature: number | null;
	total_rainfall: number;
	sunny_days_count: number;
	rainy_days_count: number;
	max_wind_gust: number | null;
	avg_humidity: number | null;
	avg_wind_speed: number | null;
}

export interface AdvisoryResponse {
	advice_text: string;
	risk_level: RiskLevel;
	based_on: {
		date: ISODateString | string;
		temperature_2m_max: number;
		rain_sum: number;
		wind_speed_10m_max: number;
		relative_humidity_2m_mean: number;
	};
}

export interface CityWeatherCompare {
	city_id: number;
	city_name: string;
	date: ISODateString | null;
	temperature_2m_mean: number | null;
	temperature_2m_max: number | null;
	rain_sum: number | null;
	wind_speed_10m_max: number | null;
	weather_code: number | null;
}

export interface ExtremeResult {
	city_id: number;
	city_name: string;
	value: number;
	type: ExtremeType;
	date: ISODateString;
}

export interface WeatherHistoryParams {
	start_date?: ISODateString;
	end_date?: ISODateString;
	days?: number;
}

export interface WeatherStatsParams {
	month: string;
}

export interface WeatherExtremesParams {
	type: ExtremeType;
	start_date: ISODateString;
	end_date: ISODateString;
}

export interface CompareCitiesParams {
	city_ids: number[];
}

export type CurrentWeatherResponse = ApiResponse<WeatherDaily>;
export type WeatherHistoryResponse = ApiResponse<WeatherDaily[]>;
export type WeatherStatsResponse = ApiResponse<WeatherStats>;
export type AdvisoryApiResponse = ApiResponse<AdvisoryResponse>;
export type CompareCitiesResponse = ApiResponse<CityWeatherCompare[]>;
export type WeatherExtremesResponse = ApiResponse<ExtremeResult>;
