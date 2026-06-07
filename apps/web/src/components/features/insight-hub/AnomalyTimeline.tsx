import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import type { AnomalyRecord } from '../../../types/anomaly';

interface AnomalyTimelineProps {
    records: AnomalyRecord[];
}

export default function AnomalyTimeline({ records }: AnomalyTimelineProps) {
    const { isDark } = useTheme();

    const anomalyEvents = records
        .filter((item) => item.is_anomaly)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 10)
        .map((item) => {
            const temp = item.temperature_2m_max ?? item.temperature_2m_mean ?? item.temperature_2m_min;
            const humidity = item.relative_humidity_2m_mean;
            const wind = item.wind_speed_10m_max;

            let type = 'Biến Động Khí Hậu';
            if ((temp ?? 0) >= 37) {
                type = 'Nhiệt Độ Tăng Cao';
            } else if ((item.rain_sum ?? 0) >= 30) {
                type = 'Mưa Lớn Đột Biến';
            } else if ((wind ?? 0) >= 45) {
                type = 'Gió Giật Mạnh';
            } else if ((humidity ?? 0) >= 90 && (temp ?? 99) <= 22) {
                type = 'Nguy Cơ Sương Mù';
            }

            return {
                date: item.date,
                type,
                score: item.anomaly_score,
                reason: `Nhiệt độ: ${temp ?? 'N/A'}°C · Lượng mưa: ${item.rain_sum ?? 0}mm · Tốc độ gió: ${wind ?? 0}km/h · Độ ẩm: ${humidity ?? 'N/A'}%`,
            };
        });

    if (anomalyEvents.length === 0) {
        return (
            <div className={`flex flex-col items-center justify-center h-[300px] text-center border-2 border-dashed rounded-xl ${isDark ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-400/30 bg-emerald-50'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                    <i className="fa-solid fa-shield-halved text-2xl text-emerald-500"></i>
                </div>
                <h4 className="text-sm font-black text-emerald-500 uppercase tracking-widest">Hệ Thống Ổn Định</h4>
                <p className={`text-[11px] mt-2 max-w-[250px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Mô hình AI không phát hiện bất kỳ ngày thời tiết dị biệt/bất thường nào trong khoảng thời gian đã chọn.
                </p>
            </div>
        );
    }

    return (
        <div className="relative">
            <div className="space-y-5 max-h-[350px] overflow-y-auto no-scrollbar pl-2 pt-2 pr-2">
                {anomalyEvents.map((event, idx) => (
                    <div key={`${event.date}-${idx}`} className={`relative pl-6 pb-2 border-l-2 ${isDark ? 'border-gray-800' : 'border-gray-200'} last:border-0`}>
                        
                        {/* Nút tròn Timeline - Style lại chuẩn SCADA */}
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full flex items-center justify-center ${isDark ? 'bg-[#1e1e1e]' : 'bg-white'}`}>
                            <div className="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-500/20 animate-pulse"></div>
                        </div>
                        
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#151515] border-[#2a2d33]' : 'bg-gray-50 border-gray-200'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{event.type}</span>
                                <span className={`text-[9px] font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{event.date}</span>
                            </div>

                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-200'}`}>
                                Điểm bất thường (AI Score): {event.score.toFixed(3)}
                            </span>

                            <p className={`text-[10px] font-medium leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                <span className="text-gray-500 font-bold mr-1">Giải thích (xAI):</span>
                                {event.reason}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <div className={`pointer-events-none absolute bottom-0 left-0 h-8 w-full ${isDark ? 'bg-gradient-to-t from-[#151515] to-transparent' : 'bg-gradient-to-t from-gray-50 to-transparent'}`} />
        </div>
    );
}