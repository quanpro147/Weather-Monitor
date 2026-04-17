import { api, requireSuccessData } from './api';
import type {
	City,
	GetCityResponse,
	ListCitiesParams,
	ListCitiesResponse,
	SearchCitiesResponse,
} from '../types/city';

export async function listCities(params: ListCitiesParams = {}): Promise<City[]> {
	const response = await api.get<ListCitiesResponse>('/cities', {
		country: params.country,
	});
	return requireSuccessData(response, 'Failed to load city list');
}

export async function searchCities(keyword: string): Promise<City[]> {
	const response = await api.get<SearchCitiesResponse>('/cities/search', {
		q: keyword,
	});
	return requireSuccessData(response, 'Failed to search cities');
}

export async function getCityById(cityId: number): Promise<City> {
	const response = await api.get<GetCityResponse>(`/cities/${cityId}`);
	return requireSuccessData(response, `City ${cityId} was not found`);
}
