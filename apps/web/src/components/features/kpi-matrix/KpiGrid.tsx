import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { useWeatherData } from '../../../hooks/useWeatherData';

export default function KpiGrid() {
	const { cityId, startDate, endDate } = useGlobalFilter();
	const { current, isLoading, error } = useWeatherData({ cityId, startDate, endDate, enabled: cityId !== null });

	if (cityId === null) return <p className="text-sm text-gray-400">Select a city to view KPIs.</p>;
	if (isLoading) return <p className="text-sm text-gray-400">Loading KPI data...</p>;
	if (error) return <p className="text-sm text-red-400">{error}</p>;

	return (
		<div className="grid grid-cols-2 gap-3">
			<div className="rounded-lg border border-[#2a2a2a] p-3">Temp: {current?.temperature_2m_max ?? '--'}C</div>
			<div className="rounded-lg border border-[#2a2a2a] p-3">Rain: {current?.rain_sum ?? '--'} mm</div>
		</div>
	);
}
