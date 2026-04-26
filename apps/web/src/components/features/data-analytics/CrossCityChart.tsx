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
import { useTheme } from '../../../contexts/ThemeContext';

const crossCityMock = [
	{ city: 'Ha Noi', temp: 32, aqi: 150, rain: 20 },
	{ city: 'Da Nang', temp: 28, aqi: 65, rain: 150 },
	{ city: 'TP.HCM', temp: 35, aqi: 110, rain: 0 },
];

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
	const config = metricConfig[metric];
	const minChartWidth = Math.max(640, crossCityMock.length * 120);

	return (
		<section className={`rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>Cross-City Comparison</h3>
					<p className={`mt-1 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Metric profile across key cities</p>
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
							className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition-colors ${
								metric === key
									? 'bg-cyan-600 text-white'
									: isDark
										? 'text-gray-400 hover:text-gray-200'
										: 'text-gray-500 hover:text-gray-900'
							}`}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			<div className="w-full overflow-x-auto no-scrollbar">
				<div style={{ minWidth: `${minChartWidth}px`, height: '300px' }}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart data={crossCityMock} margin={{ top: 8, right: 12, left: -16, bottom: 4 }} barCategoryGap="18%" barGap={2}>
							<defs>
								<linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor={config.top} stopOpacity={0.95} />
									<stop offset="60%" stopColor={config.bottom} stopOpacity={0.8} />
									<stop offset="100%" stopColor={config.bottom} stopOpacity={0.35} />
								</linearGradient>
							</defs>

							<CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#cbd5e1'} strokeOpacity={0.2} vertical={false} />
							<XAxis
								dataKey="city"
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
								contentStyle={{
									backgroundColor: isDark ? '#0f1115' : '#ffffff',
									border: `1px solid ${isDark ? '#2a2a2a' : '#e2e8f0'}`,
									borderRadius: '8px',
									color: isDark ? '#e5e7eb' : '#0f172a',
									fontSize: '11px',
								}}
								formatter={(value: number) => [`${value} ${config.unit}`.trim(), config.label]}
							/>
							<Bar dataKey={metric} fill={`url(#${config.gradientId})`} barSize={44} radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				</div>
			</div>
		</section>
	);
}

