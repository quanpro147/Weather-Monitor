import type { AdvisoryResponse, WeatherDaily } from '../../../types/weather';

interface KpiGridProps {
	current: WeatherDaily | null;
	history: WeatherDaily[];
	advisory: AdvisoryResponse | null;
	isLoading: boolean;
	error: string | null;
}

type WeatherWithOptionalRealtime = WeatherDaily & {
	aqi?: number | null;
	pressure?: number | null;
	visibility?: number | null;
	temperature?: number | null;
	wind_speed?: number | null;
	humidity?: number | null;
	precipitation?: number | null;
};

function formatNumber(value: number | null | undefined, digits = 1): string {
	if (value === null || value === undefined || Number.isNaN(value)) {
		return '--';
	}
	return value.toFixed(digits);
}

function aqiRiskText(aqi: number | null | undefined): string {
	if (aqi === null || aqi === undefined) {
		return 'Unavailable';
	}
	if (aqi <= 50) {
		return 'Good';
	}
	if (aqi <= 100) {
		return 'Moderate';
	}
	if (aqi <= 150) {
		return 'Sensitive group risk';
	}
	if (aqi <= 200) {
		return 'Unhealthy';
	}
	return 'Very unhealthy';
}

function resolveTempDelta(history: WeatherDaily[], current: WeatherDaily | null): string {
	if (!current) {
		return 'No baseline';
	}

	const previousDay = history.length > 1 ? history[history.length - 2] : null;
	const currentTemp = current.temperature_2m_max;
	const previousTemp = previousDay?.temperature_2m_max;

	if (currentTemp === null || currentTemp === undefined || previousTemp === null || previousTemp === undefined) {
		return 'No baseline';
	}

	const delta = currentTemp - previousTemp;
	const sign = delta >= 0 ? '+' : '';
	return `${sign}${delta.toFixed(1)}°C vs previous day`;
}

export default function KpiGrid({ current, history, advisory, isLoading, error }: KpiGridProps) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-2 gap-4 xl:col-span-7">
				{Array.from({ length: 4 }).map((_, idx) => (
					<div key={idx} className="h-[132px] animate-pulse rounded-2xl border border-gray-200 dark:border-[#2a2a2a] bg-gray-100 dark:bg-[#151515]" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="xl:col-span-7 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
				Unable to render KPI cards: {error}
			</div>
		);
	}

	const realtime = (current ?? null) as WeatherWithOptionalRealtime | null;
	const currentTemp = realtime?.temperature ?? current?.temperature_2m_max ?? current?.temperature_2m_mean;
	const aqi = realtime?.aqi ?? null;
	const humidity = realtime?.humidity ?? current?.relative_humidity_2m_mean;
	const rainfall = realtime?.precipitation ?? current?.rain_sum;

	const advisoryText = advisory?.advice_text ?? 'No advisory available';
	const cards = [
		{
			label: 'Current Temp',
			value: `${formatNumber(currentTemp)}°C`,
			trend: resolveTempDelta(history, current),
			icon: 'fa-temperature-half',
			color: 'text-orange-500 dark:text-orange-400',
			bg: 'bg-orange-50 dark:bg-orange-500/10',
		},
		{
			label: 'AQI Index',
			value: formatNumber(aqi, 0),
			trend: aqiRiskText(aqi),
			icon: 'fa-smog',
			color: 'text-red-500 dark:text-red-400',
			bg: 'bg-red-50 dark:bg-red-500/10',
		},
		{
			label: 'Humidity',
			value: `${formatNumber(humidity, 0)}%`,
			trend: advisory?.risk_level ? `Risk: ${advisory.risk_level}` : 'No risk level',
			icon: 'fa-droplet',
			color: 'text-cyan-500 dark:text-cyan-400',
			bg: 'bg-cyan-50 dark:bg-cyan-500/10',
		},
		{
			label: 'Rainfall',
			value: `${formatNumber(rainfall)} mm`,
			trend: advisoryText.length > 36 ? `${advisoryText.slice(0, 36)}...` : advisoryText,
			icon: 'fa-cloud-rain',
			color: 'text-blue-500 dark:text-blue-400',
			bg: 'bg-blue-50 dark:bg-blue-500/10',
		},
	];

	return (
		<div className="grid grid-cols-2 gap-4 xl:col-span-7">
			{cards.map((kpi) => (
				<article key={kpi.label} className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-4 transition-colors shadow-sm flex flex-col justify-between">
					<div className="flex items-center justify-between mb-2">
						<p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#6b7280]">{kpi.label}</p>
						<div className={`h-8 w-8 flex items-center justify-center rounded-lg ${kpi.bg} ${kpi.color}`}>
							<i className={`fa-solid ${kpi.icon} text-sm`} />
						</div>
					</div>
					<div>
						<p className="text-3xl font-black text-gray-900 dark:text-[#f3f4f6] leading-none">{kpi.value}</p>
						<p className={`mt-1.5 text-[10px] font-bold ${kpi.color} leading-none`}>{kpi.trend}</p>
					</div>
				</article>
			))}
		</div>
	);
}
