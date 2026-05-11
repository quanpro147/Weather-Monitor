import React from 'react';
import useSWR from 'swr';
import ExtremesCards from './ExtremesCards';
import CrossCityChart from './CrossCityChart';
import DistributionChart from './DistributionChart';
import ClusteringChart from './ClusteringChart';
import TrendChart from './TrendChart';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { getWeatherHistory } from '../../../services/weather.service';

function StatCard({
    label,
    value,
    trend,
    valueColor,
    points,
    stroke,
    isDark,
}: {
    label: string;
    value: string;
    trend: string;
    valueColor: string;
    points: string;
    stroke: string;
    isDark: boolean;
}) {
    return (
        <article className={`relative overflow-hidden rounded-lg border p-3 ${isDark ? 'border-[#2a2a2a] bg-[#101215]' : 'border-gray-200 bg-gray-50'}`}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-black ${valueColor}`}>{value}</p>
            <p className={`mt-1 text-[10px] font-semibold ${valueColor}`}>{trend}</p>
            <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-10 w-full opacity-30">
                <polyline fill="none" stroke={stroke} strokeWidth="2.2" points={points} />
            </svg>
        </article>
    );
}

export default function EdaView() {
    const { isDark } = useTheme();
    const { cityId, startDate, endDate } = useGlobalFilter();

    const { data: records } = useSWR(
        cityId !== null ? `eda-stats:${cityId}:${startDate}:${endDate}` : null,
        () => getWeatherHistory(cityId as number, { start_date: startDate, end_date: endDate }),
    );

    const stats = React.useMemo(() => {
        if (!records || records.length === 0) return null;
        const temps = records.map((r) => r.temperature_2m_mean ?? 0).filter(Boolean);
        const rains = records.map((r) => r.rain_sum ?? 0);
        const avgTemp = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
        const rainyDays = rains.filter((r) => r > 1).length;
        const totalRain = rains.reduce((a, b) => a + b, 0);
        return {
            avgTemp: avgTemp.toFixed(1),
            rainyDays,
            totalRain: totalRain.toFixed(0),
        };
    }, [records]);

    return (
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 animate-in fade-in duration-700">
            <div className="mb-1 flex items-center justify-between shrink-0">
                <div>
                    <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>The Analyst Workbench</h2>
                    <p className={`mt-1 text-xs font-medium ${isDark ? 'text-[#9ca3af]' : 'text-gray-500'}`}>Exploratory Data Analysis in professional SCADA mode</p>
                </div>
            </div>

            <ExtremesCards />

            <TrendChart />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-7">
                    <CrossCityChart />
                </div>

                <section className={`xl:col-span-5 rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>Period Summary</h3>
                    <p className={`mt-1 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        {cityId === null ? 'Select a city to see aggregate statistics' : `Aggregated over selected date range`}
                    </p>

                    <div className="mt-5 space-y-3">
                        <StatCard
                            label="Average Temperature"
                            value={stats ? `${stats.avgTemp}°C` : '—'}
                            trend={cityId === null ? 'No city selected' : stats ? 'mean over period' : 'Loading…'}
                            valueColor="text-red-400"
                            points="0,20 18,16 36,14 54,10 72,9 100,8"
                            stroke="#fb7185"
                            isDark={isDark}
                        />
                        <StatCard
                            label="Rainy Days (>1mm)"
                            value={stats ? `${stats.rainyDays}` : '—'}
                            trend={stats ? `${stats.totalRain}mm total rainfall` : cityId === null ? 'No city selected' : 'Loading…'}
                            valueColor="text-blue-400"
                            points="0,6 18,8 36,10 54,12 72,15 100,18"
                            stroke="#60a5fa"
                            isDark={isDark}
                        />
                        <StatCard
                            label="Days in Period"
                            value={stats ? `${records?.length ?? 0}` : '—'}
                            trend={stats ? `${startDate} → ${endDate}` : cityId === null ? 'No city selected' : 'Loading…'}
                            valueColor="text-purple-400"
                            points="0,18 18,16 36,14 54,13 72,11 100,9"
                            stroke="#c084fc"
                            isDark={isDark}
                        />
                    </div>
                </section>
            </div>

            <DistributionChart />

            <div className="mt-8">
                <ClusteringChart />
            </div>
        </div>
    );
}
