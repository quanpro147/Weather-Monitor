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
		return 'Chưa có số liệu';
	}
	if (aqi <= 50) return 'Không khí: Tốt & Sạch';
	if (aqi <= 100) return 'Không khí: Khá / Trung bình';
	if (aqi <= 150) return 'Nhóm nhạy cảm nên chú ý';
	if (aqi <= 200) return 'Không khí ô nhiễm, có hại';
	return 'Ô nhiễm nghiêm trọng, rất hại';
}

function resolveTempDelta(history: WeatherDaily[], current: WeatherDaily | null): string {
	if (!current) return 'Chưa có mốc so sánh';

	const previousDay = history.length > 1 ? history[history.length - 2] : null;
	const currentTemp = current.temperature_2m_max;
	const previousTemp = previousDay?.temperature_2m_max;

	if (currentTemp == null || previousTemp == null) return 'Chưa có mốc so sánh';

	const delta = currentTemp - previousTemp;
	const sign = delta >= 0 ? '+' : '';
	return `${sign}${delta.toFixed(1)}°C so với hôm qua`;
}

function avg(values: number[]): number | null {
	if (values.length === 0) return null;
	return values.reduce((a, b) => a + b, 0) / values.length;
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
				Không thể hiển thị thẻ chỉ số: {error}
			</div>
		);
	}

	const realtime = (current ?? null) as WeatherWithOptionalRealtime | null;
	const currentTemp = realtime?.temperature ?? current?.temperature_2m_max ?? current?.temperature_2m_mean;
	const aqi = realtime?.aqi ?? null;
	const todayHumidity = realtime?.humidity ?? current?.relative_humidity_2m_mean;
	const todayRainfall = realtime?.precipitation ?? current?.rain_sum;

	// Period aggregates from history (active when date range > 1 day)
	const periodDays = history.length;
	const usePeriod = periodDays > 1;

	const historyTemps = history.map(r => r.temperature_2m_max ?? r.temperature_2m_mean).filter((v): v is number => v != null);
	const periodAvgTemp = avg(historyTemps);

	const periodTotalRain = history.reduce((sum, r) => sum + (r.rain_sum ?? 0), 0);

	const historyHumidity = history.map(r => r.relative_humidity_2m_mean).filter((v): v is number => v != null);
	const periodAvgHumidity = avg(historyHumidity);

	const advisoryText = advisory?.advice_text ?? 'Không có thông tin khuyến nghị';

	const riskMap: Record<string, string> = {
		high: 'Rủi ro cao',
		medium: 'Rủi ro trung bình',
		low: 'Rủi ro thấp / An toàn',
	};
	const riskLabel = advisory?.risk_level 
		? (riskMap[advisory.risk_level.toLowerCase()] ?? advisory.risk_level)
		: 'An toàn';

	const cards = [
		{
			label: usePeriod ? `Nhiệt Độ TB ${periodDays} Ngày` : 'Nhiệt Độ Hôm Nay',
			value: `${formatNumber(usePeriod ? periodAvgTemp : currentTemp)}°C`,
			trend: usePeriod
				? `Hôm nay: ${formatNumber(currentTemp)}°C`
				: resolveTempDelta(history, current),
			icon: 'fa-temperature-half',
			color: 'text-orange-500 dark:text-orange-400',
			bg: 'bg-orange-50 dark:bg-orange-500/10',
		},
		{
			label: 'Chất Lượng Không Khí AQI',
			value: formatNumber(aqi, 0),
			trend: aqiRiskText(aqi),
			icon: 'fa-smog',
			color: 'text-red-500 dark:text-red-400',
			bg: 'bg-red-50 dark:bg-red-500/10',
		},
		{
			label: usePeriod ? `Độ Ẩm TB ${periodDays} Ngày` : 'Độ Ẩm Hiện Tại',
			value: `${formatNumber(usePeriod ? periodAvgHumidity : todayHumidity, 0)}%`,
			trend: `Cảnh báo: ${riskLabel}`,
			icon: 'fa-droplet',
			color: 'text-cyan-500 dark:text-cyan-400',
			bg: 'bg-cyan-50 dark:bg-cyan-500/10',
		},
		{
			label: usePeriod ? `Tổng Mưa ${periodDays} Ngày` : 'Lượng Mưa Hôm Nay',
			value: `${formatNumber(usePeriod ? periodTotalRain : todayRainfall)} mm`,
			trend: usePeriod
				? `Hôm nay: ${formatNumber(todayRainfall)} mm`
				: advisoryText.length > 36 ? `${advisoryText.slice(0, 36)}...` : advisoryText,
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
