import type { ApiResponse } from './common';

export interface City {
	city_id: number;
	city: string;
	country: string;
	latitude: number;
	longitude: number;
}

export interface ListCitiesParams {
	country?: string;
	min_lat?: number;
	max_lat?: number;
	min_lng?: number;
	max_lng?: number;
	limit?: number;
}

export interface SearchCitiesParams {
	q: string;
}

export type ListCitiesResponse = ApiResponse<City[]>;
export type SearchCitiesResponse = ApiResponse<City[]>;
export type GetCityResponse = ApiResponse<City>;
