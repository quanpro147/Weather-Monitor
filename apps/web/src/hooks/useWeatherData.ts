import { useCallback, useEffect, useMemo, useState } from 'react';

import { getCurrentWeather, getWeatherHistory, getWeatherStats } from '../services/weather.service';
import type { ISODateString } from '../types/common';
import type { WeatherDaily, WeatherStats } from '../types/weather';

interface UseWeatherDataParams {
	cityId: number | null;
	startDate?: ISODateString;
	endDate?: ISODateString;
	month?: string;
	days?: number;
	enabled?: boolean;
}

interface UseWeatherDataResult {
	current: WeatherDaily | null;
	history: WeatherDaily[];
	stats: WeatherStats | null;
	isLoading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export function useWeatherData({
	cityId,
	startDate,
	endDate,
	month,
	days,
	enabled = true,
}: UseWeatherDataParams): UseWeatherDataResult {
	const [current, setCurrent] = useState<WeatherDaily | null>(null);
	const [history, setHistory] = useState<WeatherDaily[]>([]);
	const [stats, setStats] = useState<WeatherStats | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const resolvedMonth = useMemo(() => {
		if (month) {
			return month;
		}
		if (endDate) {
			return endDate.slice(0, 7);
		}
		return new Date().toISOString().slice(0, 7);
	}, [month, endDate]);

	const refetch = useCallback(async () => {
		if (!enabled || cityId === null) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const historyQuery = startDate && endDate
				? { start_date: startDate, end_date: endDate }
				: { days: days ?? 7 };

			const [nextCurrent, nextHistory, nextStats] = await Promise.all([
				getCurrentWeather(cityId),
				getWeatherHistory(cityId, historyQuery),
				getWeatherStats(cityId, resolvedMonth),
			]);

			setCurrent(nextCurrent);
			setHistory(nextHistory);
			setStats(nextStats);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load weather data');
		} finally {
			setIsLoading(false);
		}
	}, [cityId, days, enabled, endDate, resolvedMonth, startDate]);

	useEffect(() => {
		void refetch();
	}, [refetch]);

	return {
		current,
		history,
		stats,
		isLoading,
		error,
		refetch,
	};
}
