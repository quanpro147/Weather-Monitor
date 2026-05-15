import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getCurrentWeather, getWeatherHistory, getWeatherStats } from '../services/weather.service';
import type { ISODateString } from '../types/common';
import type { WeatherDaily, WeatherStats } from '../types/weather';

// Matches CURRENT_CACHE_TTL on the backend (900 s) — re-fetch just after Redis expires.
const POLL_INTERVAL_MS = 15 * 60 * 1_000;

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

	// Keep a stable ref so the interval can call the latest refetch without
	// restarting the timer on every dep change.
	const refetchRef = useRef(refetch);
	useEffect(() => { refetchRef.current = refetch; }, [refetch]);

	useEffect(() => {
		if (!enabled || cityId === null) return;
		const id = setInterval(() => void refetchRef.current(), POLL_INTERVAL_MS);
		return () => clearInterval(id);
	}, [enabled, cityId]);

	return {
		current,
		history,
		stats,
		isLoading,
		error,
		refetch,
	};
}
