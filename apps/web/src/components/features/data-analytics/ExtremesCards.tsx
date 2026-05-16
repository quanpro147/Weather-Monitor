import React from 'react';
import useSWR from 'swr';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { getExtremes } from '../../../services/analytics.service';
import ChartSkeleton from '../../common/ChartSkeleton';
import EmptyState from '../../common/EmptyState';

const cards = [
	{
		key: 'hottest' as const,
		label: 'National Hottest',
		icon: 'fa-fire',
		valueClass: 'text-red-500',
		iconClass: 'text-red-500',
		accentClass: 'border-l-red-500',
		format: (v: number) => `${v.toFixed(1)}°C`,
	},
	{
		key: 'rainiest' as const,
		label: 'Max Precipitation',
		icon: 'fa-cloud-showers-heavy',
		valueClass: 'text-blue-400',
		iconClass: 'text-blue-400',
		accentClass: 'border-l-blue-500',
		format: (v: number) => `${v.toFixed(1)} mm`,
	},
	{
		key: 'worst_aqi' as const,
		label: 'Worst Air Quality',
		icon: 'fa-smog',
		valueClass: 'text-purple-400',
		iconClass: 'text-purple-400',
		accentClass: 'border-l-purple-500',
		format: (v: number) => `${v.toFixed(0)}`,
	},
] as const;

export default function ExtremesCards() {
	const { isDark } = useTheme();
	const { scopeMode } = useGlobalFilter();
	const { data, isLoading, error } = useSWR(
		['analytics:extremes', scopeMode],
		() => getExtremes(scopeMode),
	);

	if (isLoading) {
		return (
			<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
				{cards.map((card) => (
					<ChartSkeleton
						key={card.key}
						className={`h-28 border-l-4 ${card.accentClass}`}
					/>
				))}
			</section>
		);
	}

	if (error || !data) {
		return (
			<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<EmptyState message="No data available" className="h-28 md:col-span-3" />
			</section>
		);
	}

	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
			{cards.map((card) => {
				const entry = data[card.key];
				return (
					<article
						key={card.key}
						className={`rounded-xl border border-l-4 ${card.accentClass} p-4 shadow-sm ${
							isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'
						}`}
					>
						<div className="mb-3 flex items-start justify-between gap-3">
							<div>
								<p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{card.label}</p>
								<h3 className={`mt-1 text-lg font-black ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>{entry.city}</h3>
							</div>
							<i className={`fa-solid ${card.icon} ${card.iconClass} text-lg`} aria-hidden="true"></i>
						</div>
						<p className={`text-2xl font-black leading-none ${card.valueClass}`}>{card.format(entry.value)}</p>
						<p className={`mt-2 text-[11px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Observed {entry.date}</p>
					</article>
				);
			})}
		</section>
	);
}
