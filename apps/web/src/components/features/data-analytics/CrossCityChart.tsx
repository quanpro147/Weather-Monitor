import React from 'react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import useSWR from 'swr';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { getCrossCity } from '../../../services/analytics.service';
import ChartSkeleton from '../../common/ChartSkeleton';
import EmptyState from '../../common/EmptyState';
import { getTooltipStyles } from '../../../utils/chartStyles';

type MetricKey = 'temp' | 'aqi' | 'rain';

const metricConfig: Record<
	MetricKey,
	{
		label: string;
		unit: string;
		gradientId: string;
		top: string;
		bottom: string;
	}
> = {
	temp: {
		label: 'Temperature',
		unit: '°C',
		gradientId: 'crossCityTempGrad',
		top: '#fb7185',
		bottom: '#9f1239',
	},
	aqi: {
		label: 'AQI',
		unit: '',
		gradientId: 'crossCityAqiGrad',
		top: '#38bdf8',
		bottom: '#0369a1',
	},
	rain: {
		label: 'Rainfall',
		unit: 'mm',
		gradientId: 'crossCityRainGrad',
		top: '#a78bfa',
		bottom: '#5b21b6',
	},
};

export default function CrossCityChart() {
	const [metric, setMetric] = React.useState<MetricKey>('aqi');
	const { isDark } = useTheme();
	const { scopeMode } = useGlobalFilter();
	const config = metricConfig[metric];
	const tooltipStyles = getTooltipStyles(isDark);

	const { data, isLoading, error } = useSWR(
		['analytics:cross-city', scopeMode],
		() => getCrossCity(scopeMode),
	);

	const cities = React.useMemo(() => {
		const rows = data?.cities ?? [];
		return [...rows]
			.sort((a, b) => {
				const aValue = a[metric] ?? -Infinity;
				const bValue = b[metric] ?? -Infinity;
				return bValue - aValue;
			})
			.slice(0, 10);
	}, [data?.cities, metric]);

	return (
		<section className={`rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>
						REGIONAL METRIC RANKING
					</h3>
					<p className={`mt-1 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
						Top cities with the highest recorded values for the selected metric.
					</p>
				</div>

				<div className={`flex items-center gap-1 rounded-lg border p-1 ${isDark ? 'border-[#2a2a2a] bg-[#101215]' : 'border-gray-200 bg-gray-50'}`}>
					{(
						[
							['aqi', 'AQI'],
							['temp', 'Temp'],
							['rain', 'Rain'],
						] as Array<[MetricKey, string]>
					).map(([key, label]) => (
						<button
							key={key}
							type="button"
							onClick={() => setMetric(key)}
							className={`rounded-md border px-3 py-1.5 text-[10px] font-bold transition-colors ${
								metric === key
									? key === 'aqi'
										? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
										: key === 'temp'
											? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
											: 'bg-blue-500/20 text-blue-400 border-blue-500/50'
									: isDark
										? 'border-transparent text-gray-400 hover:text-gray-200'
										: 'border-transparent text-gray-500 hover:text-gray-900'
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{isLoading && (
				<ChartSkeleton className="h-[300px]" />
			)}

			{(error || (!isLoading && cities.length === 0)) && (
				<EmptyState message="No data available" className="h-[300px]" />
			)}

			{!isLoading && !error && cities.length > 0 && (
				<div className="h-[320px] w-full">
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							layout="vertical"
							data={cities}
							margin={{ top: 8, right: 16, left: 12, bottom: 8 }}
							barCategoryGap="18%"
							barGap={2}
						>
								<defs>
									<linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor={config.top} stopOpacity={0.95} />
										<stop offset="60%" stopColor={config.bottom} stopOpacity={0.8} />
										<stop offset="100%" stopColor={config.bottom} stopOpacity={0.35} />
									</linearGradient>
								</defs>

								<CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#cbd5e1'} strokeOpacity={0.2} vertical={false} />
								<XAxis type="number" hide />
								<YAxis
									type="category"
									dataKey="city"
									width={100}
									tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 700 }}
									axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
									tickLine={false}
								/>
								<Tooltip
									cursor={{ fill: isDark ? '#1f2937' : '#e2e8f0', opacity: 0.35 }}
									contentStyle={tooltipStyles.contentStyle}
									itemStyle={tooltipStyles.itemStyle}
									labelStyle={tooltipStyles.labelStyle}
									wrapperStyle={tooltipStyles.wrapperStyle}
									formatter={(value: number) => [`${value} ${config.unit}`.trim(), config.label]}
								/>
								<Bar dataKey={metric} fill={`url(#${config.gradientId})`} barSize={20} radius={[0, 4, 4, 0]} />
							</BarChart>
						</ResponsiveContainer>
				</div>
			)}
		</section>
	);
}
