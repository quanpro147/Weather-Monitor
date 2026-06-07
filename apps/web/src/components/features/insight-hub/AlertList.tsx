import React from 'react';
import type { AnomalyRecord } from '../../../types/anomaly';
import type { AdvisoryResponse } from '../../../types/weather';
import { useTheme } from '../../../contexts/ThemeContext';

interface AlertListProps {
	advisory: AdvisoryResponse | null;
	records: AnomalyRecord[];
	isLoading: boolean;
	error: string | null;
}

export default function AlertList({ advisory, records, isLoading, error }: AlertListProps) {
	const { isDark } = useTheme();

	if (isLoading) {
		return (
			<div className="space-y-3">
				<div className={`h-16 rounded-xl animate-pulse ${isDark ? 'bg-[#151515]' : 'bg-gray-100'}`}></div>
				<div className={`h-16 rounded-xl animate-pulse ${isDark ? 'bg-[#151515]' : 'bg-gray-100'}`}></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={`rounded-xl border p-3 text-sm ${isDark ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
				Failed to load alert stream: {error}
			</div>
		);
	}

	const anomalies = records
		.filter((item) => item.is_anomaly)
		.sort((a, b) => b.anomaly_score - a.anomaly_score)
		.slice(0, 4);

	return (
		<div className="space-y-3">
			{advisory && (
				<article className={`rounded-xl border p-3 ${isDark ? 'bg-[#151515] border-[#2a2d33]' : 'bg-gray-50 border-gray-200'}`}>
					<div className="flex items-center justify-between gap-2">
						<p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
							Khuyến Nghị An Toàn (Live Advisory)
						</p>
						<span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${advisory.risk_level === 'high' ? 'bg-red-500/15 text-red-500' : advisory.risk_level === 'medium' ? 'bg-amber-500/15 text-amber-500' : 'bg-emerald-500/15 text-emerald-500'}`}>
							{advisory.risk_level === 'high' ? 'NGUY HIỂM CAO' : advisory.risk_level === 'medium' ? 'CẢNH BÁO' : 'BÌNH THƯỜNG'}
						</span>
					</div>
					<p className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
						{advisory.advice_text}
					</p>
				</article>
			)}

			{anomalies.map((event) => (
				<article key={`${event.date}-${event.anomaly_score}`} className={`rounded-xl border p-3 ${isDark ? 'bg-[#151515] border-[#2a2d33]' : 'bg-gray-50 border-gray-200'}`}>
					<div className="flex items-center justify-between gap-2">
						<p className="text-[10px] font-black uppercase tracking-widest text-red-500">
							Sự Kiện Thời Tiết Dị Biệt (AI Anomaly)
						</p>
						<span className={`text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{event.date}</span>
					</div>

					<div className="mt-2">
						<span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-200'}`}>
							Điểm bất thường (AI Score): {event.anomaly_score.toFixed(3)}
						</span>
					</div>

					<p className={`mt-2 text-xs leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
						Nhiệt độ: {event.temperature_2m_mean ?? event.temperature_2m_max ?? event.temperature_2m_min ?? 'N/A'}°C · Lượng mưa: {event.rain_sum ?? 0}mm · Tốc độ gió: {event.wind_speed_10m_max ?? 0}km/h · Độ ẩm: {event.relative_humidity_2m_mean ?? 'N/A'}%.
					</p>
				</article>
			))}

			{!advisory && anomalies.length === 0 && (
				<div className={`rounded-xl border p-3 text-sm ${isDark ? 'border-[#2a2d33] text-gray-400' : 'border-gray-200 text-gray-500'}`}>
					Hiện tại không ghi nhận cảnh báo nguy hiểm hay dị biệt thời tiết nào.
				</div>
			)}
		</div>
	);
}

