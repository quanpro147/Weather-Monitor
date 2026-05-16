import React from 'react';
import {
	Bar,
	CartesianGrid,
	ComposedChart,
	Legend,
	Line,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import useSWR from 'swr';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { getWeatherHistory } from '../../../services/weather.service';
import ChartSkeleton from '../../common/ChartSkeleton';
import EmptyState from '../../common/EmptyState';
import { getTooltipStyles } from '../../../utils/chartStyles';

interface ChartPoint {
	date: string;
	tMax: number | null;
	tMean: number | null;
	tMin: number | null;
	rain: number | null;
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function TrendChart() {
	const { isDark } = useTheme();
	const { cityId, startDate, endDate } = useGlobalFilter();
	const tooltipStyles = getTooltipStyles(isDark);

	const swrKey = cityId !== null ? `trend:${cityId}:${startDate}:${endDate}` : null;

	const { data: records, isLoading, error } = useSWR(
		swrKey,
		() => getWeatherHistory(cityId as number, { start_date: startDate, end_date: endDate }),
	);

	const chartData: ChartPoint[] = React.useMemo(() => {
		if (!records) return [];
		return [...records]
			.sort((a, b) => a.date.localeCompare(b.date))
			.map((r) => ({
				date: formatDate(r.date),
				tMax: r.temperature_2m_max ?? null,
				tMean: r.temperature_2m_mean ?? null,
				tMin: r.temperature_2m_min ?? null,
				rain: r.rain_sum ?? null,
			}));
	}, [records]);

	const axisStyle = { fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 };
	const gridStroke = isDark ? '#334155' : '#cbd5e1';
	return (
		<section className={`rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
			<div className="mb-5">
				<h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>
					Temperature &amp; Rainfall Trend
				</h3>
				<p className={`mt-1 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
					Daily max / mean / min temperature (°C) and rainfall (mm)
				</p>
			</div>

			{cityId === null && (
				<EmptyState message="Select a city to view the trend chart" className="h-[280px]" />
			)}

			{cityId !== null && isLoading && (
				<ChartSkeleton className="h-[280px]" />
			)}

			{cityId !== null && (error || (!isLoading && chartData.length === 0)) && (
				<EmptyState message="No data available for the selected period" className="h-[280px]" />
			)}

			{cityId !== null && !isLoading && !error && chartData.length > 0 && (
				<ResponsiveContainer width="100%" height={280}>
					<ComposedChart data={chartData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
						<defs>
							<linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8} />
								<stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.3} />
							</linearGradient>
						</defs>

						<CartesianGrid strokeDasharray="3 3" stroke={gridStroke} strokeOpacity={0.2} vertical={false} />

						<XAxis
							dataKey="date"
							tick={{ ...axisStyle, fontWeight: 600 }}
							axisLine={{ stroke: gridStroke }}
							tickLine={false}
							interval="preserveStartEnd"
						/>

						<YAxis
							yAxisId="temp"
							orientation="left"
							tick={axisStyle}
							axisLine={{ stroke: gridStroke }}
							tickLine={false}
							tickFormatter={(v: number) => `${v}°`}
							domain={['auto', 'auto']}
						/>

						<YAxis
							yAxisId="rain"
							orientation="right"
							tick={axisStyle}
							axisLine={{ stroke: gridStroke }}
							tickLine={false}
							tickFormatter={(v: number) => `${v}mm`}
							width={52}
						/>

						<Tooltip
							contentStyle={tooltipStyles.contentStyle}
							itemStyle={tooltipStyles.itemStyle}
							labelStyle={tooltipStyles.labelStyle}
							wrapperStyle={tooltipStyles.wrapperStyle}
							cursor={{ fill: isDark ? '#1f2937' : '#e2e8f0', opacity: 0.25 }}
							formatter={(value: number, name: string) => {
								const labels: Record<string, string> = {
									tMax: 'Max temp',
									tMean: 'Mean temp',
									tMin: 'Min temp',
									rain: 'Rainfall',
								};
								const units: Record<string, string> = { rain: 'mm' };
								const unit = units[name] ?? '°C';
								return [`${value}${unit}`, labels[name] ?? name];
							}}
						/>

						<Legend
							iconSize={10}
							wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
							formatter={(value: string) => {
								const labels: Record<string, string> = {
									tMax: 'Max °C',
									tMean: 'Mean °C',
									tMin: 'Min °C',
									rain: 'Rain mm',
								};
								const label = labels[value] ?? value;
								return <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{label}</span>;
							}}
						/>

						<Bar yAxisId="rain" dataKey="rain" fill="url(#rainGrad)" barSize={6} radius={[2, 2, 0, 0]} opacity={0.7} />

						<Line yAxisId="temp" type="monotone" dataKey="tMax" stroke="#fb7185" strokeWidth={2} dot={false} />
						<Line yAxisId="temp" type="monotone" dataKey="tMean" stroke="#fbbf24" strokeWidth={2} dot={false} strokeDasharray="4 2" />
						<Line yAxisId="temp" type="monotone" dataKey="tMin" stroke="#38bdf8" strokeWidth={2} dot={false} />
					</ComposedChart>
				</ResponsiveContainer>
			)}
		</section>
	);
}
