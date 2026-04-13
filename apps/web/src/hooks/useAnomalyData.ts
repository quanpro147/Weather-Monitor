import { useCallback, useEffect, useState } from 'react';

import { getAnomalies } from '../services/anomaly.service';
import type { ISODateString } from '../types/common';
import type { AnomalyRecord } from '../types/anomaly';

interface UseAnomalyDataParams {
	cityId: number | null;
	startDate: ISODateString;
	endDate: ISODateString;
	enabled?: boolean;
}

interface UseAnomalyDataResult {
	records: AnomalyRecord[];
	anomalyCount: number;
	isLoading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export function useAnomalyData({
	cityId,
	startDate,
	endDate,
	enabled = true,
}: UseAnomalyDataParams): UseAnomalyDataResult {
	const [records, setRecords] = useState<AnomalyRecord[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refetch = useCallback(async () => {
		if (!enabled || cityId === null) {
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			// startDate/endDate are dynamic values from global filters.
			const nextRecords = await getAnomalies(cityId, {
				start_date: startDate,
				end_date: endDate,
			});
			setRecords(nextRecords);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load anomaly data');
		} finally {
			setIsLoading(false);
		}
	}, [cityId, enabled, endDate, startDate]);

	useEffect(() => {
		void refetch();
	}, [refetch]);

	return {
		records,
		anomalyCount: records.filter((item) => item.is_anomaly).length,
		isLoading,
		error,
		refetch,
	};
}
