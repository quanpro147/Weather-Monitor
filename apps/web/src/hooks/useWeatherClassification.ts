import useSWR from 'swr';
import { useMemo } from 'react';
import { getCurrentWeatherBulk } from '../services/weather.service';
import { classifyWeatherCode, WEATHER_CATEGORY_ORDER } from '../lib/weatherCode';
import type { WeatherCategory, WeatherCategoryKey } from '../lib/weatherCode';
import type { City } from '../types/city';

export interface CityWeatherInfo {
    cityId: number;
    cityName: string;
    category: WeatherCategory;
    weatherCode: number | null;
    tempMean: number | null;
}

export interface CategoryDistribution {
    category: WeatherCategory;
    count: number;
    percentage: number;
    cities: CityWeatherInfo[];
}

export interface UseWeatherClassificationResult {
    distribution: CategoryDistribution[];
    cityMap: Map<number, CityWeatherInfo>;
    totalCities: number;
    isLoading: boolean;
    error: string | null;
}

/**
 * Fetches current weather for a list of cities via bulk endpoint,
 * then classifies each city by WMO weather code.
 *
 * Reuses SWR cache key — if StationsView or any other consumer already fetched
 * the same city set, no extra request fires.
 */
export function useWeatherClassification(cities: City[]): UseWeatherClassificationResult {
    const cityIds = useMemo(
        () => Array.from(new Set(cities.map((c) => c.city_id))).sort((a, b) => a - b),
        [cities],
    );

    const cacheKey = cityIds.length > 0
        ? `weather:bulk:${cityIds.join(',')}`
        : null;

    const { data: bulkWeather, error, isLoading } = useSWR(
        cacheKey,
        () => getCurrentWeatherBulk(cityIds),
        { revalidateOnFocus: false, dedupingInterval: 900_000 },
    );

    const { distribution, cityMap } = useMemo(() => {
        const cityLookup = new Map(cities.map((c) => [c.city_id, c]));
        const buckets = new Map<WeatherCategoryKey, CityWeatherInfo[]>();
        WEATHER_CATEGORY_ORDER.forEach((k) => buckets.set(k, []));
        const cityMap = new Map<number, CityWeatherInfo>();

        if (bulkWeather) {
            for (const record of bulkWeather) {
                const city = cityLookup.get(record.city_id);
                if (!city) continue;

                const category = classifyWeatherCode(record.weather_code);
                const info: CityWeatherInfo = {
                    cityId: record.city_id,
                    cityName: city.city,
                    category,
                    weatherCode: record.weather_code,
                    tempMean: record.temperature_2m_mean,
                };

                cityMap.set(record.city_id, info);
                buckets.get(category.key)!.push(info);
            }
        }

        const total = cityMap.size;

        const distribution: CategoryDistribution[] = WEATHER_CATEGORY_ORDER
            .map((key) => {
                const citiesInCat = buckets.get(key) ?? [];
                const category: WeatherCategory =
                    citiesInCat.length > 0
                        ? citiesInCat[0].category
                        : classifyWeatherCode(sentinelCode(key));

                return {
                    category,
                    count: citiesInCat.length,
                    percentage: total > 0 ? Math.round((citiesInCat.length / total) * 100) : 0,
                    cities: citiesInCat,
                };
            })
            .filter((d) => d.count > 0);

        return { distribution, cityMap };
    }, [bulkWeather, cities]);

    return {
        distribution,
        cityMap,
        totalCities: cityMap.size,
        isLoading,
        error: error instanceof Error ? error.message : error ? String(error) : null,
    };
}

function sentinelCode(key: WeatherCategoryKey): number {
    const map: Record<WeatherCategoryKey, number> = {
        Clear: 0, Cloudy: 2, Foggy: 45, Drizzle: 51, Rain: 61,
        Snow: 71, Showers: 80, Thunderstorm: 95, Unknown: -1,
    };
    return map[key] ?? -1;
}