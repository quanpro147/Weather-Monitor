import type {
  ApiResponse,
  City,
  WeatherDaily,
  WeatherStats,
  AdvisoryResponse,
  CityWeatherCompare,
  AnomalyRecord,
} from '@/types/api'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`)
  const json: ApiResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error ?? 'API error')
  return json.data
}

export function fetchCities(): Promise<City[]> {
  return get<City[]>('/cities')
}

export function fetchCurrentWeather(cityId: number): Promise<WeatherDaily> {
  return get<WeatherDaily>(`/weather/${cityId}/current`)
}

export function fetchWeatherHistory(
  cityId: number,
  startDate: string,
  endDate: string,
): Promise<WeatherDaily[]> {
  return get<WeatherDaily[]>(
    `/weather/${cityId}/history?start_date=${startDate}&end_date=${endDate}`,
  )
}

export function fetchWeatherStats(cityId: number, month: string): Promise<WeatherStats> {
  return get<WeatherStats>(`/weather/${cityId}/stats?month=${month}`)
}

export function fetchAdvisory(cityId: number): Promise<AdvisoryResponse> {
  return get<AdvisoryResponse>(`/weather/${cityId}/advisory`)
}

export function fetchCityCompare(cityIds: number[]): Promise<CityWeatherCompare[]> {
  return get<CityWeatherCompare[]>(`/weather/compare?city_ids=${cityIds.join(',')}`)
}

export function fetchAnomalies(
  cityId: number,
  startDate: string,
  endDate: string,
): Promise<AnomalyRecord[]> {
  return get<AnomalyRecord[]>(
    `/anomaly/${cityId}?start_date=${startDate}&end_date=${endDate}`,
  )
}
