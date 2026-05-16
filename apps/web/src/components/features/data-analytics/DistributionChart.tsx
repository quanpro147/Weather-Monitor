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
import { getHistogram } from '../../../services/analytics.service';
import ChartSkeleton from '../../common/ChartSkeleton';
import EmptyState from '../../common/EmptyState';
import { getTooltipStyles } from '../../../utils/chartStyles';

export default function DistributionChart() {
	const { isDark } = useTheme();
	const { scopeMode } = useGlobalFilter();
	const tooltipStyles = getTooltipStyles(isDark);
	const { data, isLoading, error } = useSWR(
		['analytics:histogram', scopeMode],
		() => getHistogram(scopeMode, 2.0),
	);

	const bins = data?.bins ?? [];

	return (
		<section className={`rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
			<div className="mb-5">
				<h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>Temperature Distribution</h3>
				<p className="mt-1 text-[10px] text-gray-500">Histogram-style frequency bins</p>
			</div>

			{isLoading && (
				<ChartSkeleton className="h-[300px]" />
			)}

			{(error || (!isLoading && bins.length === 0)) && (
				<EmptyState message="No data available" className="h-[300px]" />
			)}

			{!isLoading && !error && bins.length > 0 && (
				<ResponsiveContainer width="100%" height={300}>
					<BarChart
						data={bins}
						margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
						barCategoryGap={0}
					>
						<defs>
							<linearGradient id="histogramGrad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
								<stop offset="55%" stopColor="#ea580c" stopOpacity={0.85} />
								<stop offset="100%" stopColor="#ef4444" stopOpacity={0.45} />
							</linearGradient>
						</defs>

						<CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} vertical={false} />
						<XAxis
							dataKey="bin"
							tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 700 }}
							axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
							tickLine={false}
						/>
						<YAxis
							tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
							axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
							tickLine={false}
						/>
						<Tooltip
							cursor={{ fill: isDark ? '#1f2937' : '#e2e8f0', opacity: 0.35 }}
							contentStyle={tooltipStyles.contentStyle}
							itemStyle={tooltipStyles.itemStyle}
							labelStyle={tooltipStyles.labelStyle}
							wrapperStyle={tooltipStyles.wrapperStyle}
							formatter={(value: number) => [value, 'Frequency']}
						/>
						<Bar dataKey="count" fill="url(#histogramGrad)" radius={[0, 0, 0, 0]} stroke={isDark ? '#0f172a' : '#ffffff'} strokeWidth={1} />
					</BarChart>
				</ResponsiveContainer>
			)}
		</section>
	);
}
