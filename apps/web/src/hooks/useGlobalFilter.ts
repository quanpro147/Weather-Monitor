import React, { createContext, useContext, useMemo, useState } from 'react';

import type { ISODateString } from '../types/common';

export type DateRangePreset = '24h' | '7d' | '30d' | 'custom';

interface CustomDateRange {
	startDate: ISODateString;
	endDate: ISODateString;
}

interface GlobalFilterContextValue {
	cityId: number | null;
	dateRangePreset: DateRangePreset;
	startDate: ISODateString;
	endDate: ISODateString;
	setCityId: (cityId: number | null) => void;
	setDateRangePreset: (preset: DateRangePreset) => void;
	setCustomDateRange: (range: CustomDateRange) => void;
}

function toISODateString(date: Date): ISODateString {
	return date.toISOString().slice(0, 10) as ISODateString;
}

function resolvePresetRange(preset: DateRangePreset): CustomDateRange {
	const end = new Date();
	const start = new Date(end);

	if (preset === '24h') {
		start.setDate(end.getDate() - 1);
	} else if (preset === '30d') {
		start.setDate(end.getDate() - 30);
	} else {
		start.setDate(end.getDate() - 7);
	}

	return {
		startDate: toISODateString(start),
		endDate: toISODateString(end),
	};
}

const GlobalFilterContext = createContext<GlobalFilterContextValue | undefined>(undefined);

export function GlobalFilterProvider({ children }: { children: React.ReactNode }) {
	const [cityId, setCityId] = useState<number | null>(1);
	const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('7d');
	const [customDateRange, setCustomDateRangeState] = useState<CustomDateRange | null>(null);

	const resolvedRange = useMemo(() => {
		if (dateRangePreset === 'custom' && customDateRange) {
			return customDateRange;
		}
		return resolvePresetRange(dateRangePreset);
	}, [dateRangePreset, customDateRange]);

	const setCustomDateRange = (range: CustomDateRange) => {
		setCustomDateRangeState(range);
		setDateRangePreset('custom');
	};

	const value: GlobalFilterContextValue = {
		cityId,
		dateRangePreset,
		startDate: resolvedRange.startDate,
		endDate: resolvedRange.endDate,
		setCityId,
		setDateRangePreset,
		setCustomDateRange,
	};

	return React.createElement(GlobalFilterContext.Provider, { value }, children);
}

export function useGlobalFilter(): GlobalFilterContextValue {
	const context = useContext(GlobalFilterContext);
	if (!context) {
		throw new Error('useGlobalFilter must be used within GlobalFilterProvider');
	}
	return context;
}
