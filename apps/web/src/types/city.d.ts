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
}

export interface SearchCitiesParams {
	q: string;
}

export type ListCitiesResponse = ApiResponse<City[]>;
export type SearchCitiesResponse = ApiResponse<City[]>;
export type GetCityResponse = ApiResponse<City>;
