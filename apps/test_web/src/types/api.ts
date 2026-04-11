// Mirrors Pydantic models from services/api/

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export interface City {
  city_id: number
  city: string
  country: string
  latitude: number
  longitude: number
}

export interface WeatherDaily {
  city_id: number
  date: string
  temperature_2m_max: number | null
  temperature_2m_min: number | null
  temperature_2m_mean: number | null
  rain_sum: number | null
  wind_speed_10m_max: number | null
  wind_speed_10m_mean: number | null
  wind_gusts_10m_max: number | null
  wind_direction_10m_dominant: number | null
  relative_humidity_2m_max: number | null
  relative_humidity_2m_min: number | null
  relative_humidity_2m_mean: number | null
  cloud_cover_mean: number | null
  shortwave_radiation_sum: number | null
  weather_code: number | null
}

export interface WeatherStats {
  month: string
  avg_temperature: number | null
  total_rainfall: number
  sunny_days_count: number
  rainy_days_count: number
  max_wind_gust: number | null
  avg_humidity: number | null
  avg_wind_speed: number | null
}

export interface AdvisoryResponse {
  advice_text: string
  risk_level: 'low' | 'medium' | 'high'
  based_on: Record<string, unknown>
}

export interface CityWeatherCompare {
  city_id: number
  city_name: string
  date: string | null
  temperature_2m_mean: number | null
  temperature_2m_max: number | null
  rain_sum: number | null
  wind_speed_10m_max: number | null
  weather_code: number | null
}

export interface AnomalyRecord {
  date: string
  anomaly_score: number
  is_anomaly: boolean
  temperature_2m_max: number | null
  temperature_2m_min: number | null
  temperature_2m_mean: number | null
  rain_sum: number | null
  wind_speed_10m_max: number | null
  relative_humidity_2m_mean: number | null
  cloud_cover_mean: number | null
}
