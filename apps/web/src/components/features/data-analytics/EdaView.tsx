import React from 'react';
import ExtremesCards from './ExtremesCards';
import CrossCityChart from './CrossCityChart';
import DistributionChart from './DistributionChart';
import ClusteringChart from './ClusteringChart';
import { useTheme } from '../../../contexts/ThemeContext';

const monthlyAggregateMock = {
    averageTemp: 31.6,
    rainyDays: 11,
    fogDays: 4,
};

const monthlyTrend = {
    averageTemp: '+0.8°C vs last month',
    rainyDays: '-2 days vs last month',
    fogDays: '+1 day vs last month',
};

function MiniSparkline({ points, stroke, opacityClass = 'opacity-30' }: { points: string; stroke: string; opacityClass?: string }) {
    return (
        <svg viewBox="0 0 100 24" preserveAspectRatio="none" className={`absolute inset-x-0 bottom-0 h-10 w-full ${opacityClass}`}>
            <polyline
                fill="none"
                stroke={stroke}
                strokeWidth="2.2"
                points={points}
            />
        </svg>
    );
}

export default function EdaView() {
    const { isDark } = useTheme();

    return (
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 animate-in fade-in duration-700">
            <div className="mb-1 flex items-center justify-between shrink-0">
                <div>
                    <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>The Analyst Workbench</h2>
                    <p className={`mt-1 text-xs font-medium ${isDark ? 'text-[#9ca3af]' : 'text-gray-500'}`}>Exploratory Data Analysis in professional SCADA mode</p>
                </div>
            </div>

            <ExtremesCards />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <div className="xl:col-span-7">
                    <CrossCityChart />
                </div>

                <section className={`xl:col-span-5 rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>Monthly Aggregate Summary</h3>
                    <p className="mt-1 text-[10px] text-gray-500">Synthetic indicators while backend analytics is under construction</p>

                    <div className="mt-5 space-y-3">
                        <article className={`relative overflow-hidden rounded-lg border p-3 ${isDark ? 'border-[#2a2a2a] bg-[#101215]' : 'border-gray-200 bg-gray-50'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Average Temperature</p>
                            <p className="mt-1 text-2xl font-black text-red-400">{monthlyAggregateMock.averageTemp.toFixed(1)}°C</p>
                            <p className="mt-1 text-[10px] font-semibold text-red-400">{monthlyTrend.averageTemp}</p>
                            <MiniSparkline points="0,20 18,16 36,14 54,10 72,9 100,8" stroke="#fb7185" opacityClass="opacity-40" />
                        </article>

                        <article className={`relative overflow-hidden rounded-lg border p-3 ${isDark ? 'border-[#2a2a2a] bg-[#101215]' : 'border-gray-200 bg-gray-50'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Rainy Days</p>
                            <p className="mt-1 text-2xl font-black text-blue-400">{monthlyAggregateMock.rainyDays}</p>
                            <p className="mt-1 text-[10px] font-semibold text-emerald-400">↓ {monthlyTrend.rainyDays}</p>
                            <MiniSparkline points="0,6 18,8 36,10 54,12 72,15 100,18" stroke="#60a5fa" opacityClass="opacity-30" />
                        </article>

                        <article className={`relative overflow-hidden rounded-lg border p-3 ${isDark ? 'border-[#2a2a2a] bg-[#101215]' : 'border-gray-200 bg-gray-50'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Fog Days</p>
                            <p className="mt-1 text-2xl font-black text-purple-400">{monthlyAggregateMock.fogDays}</p>
                            <p className="mt-1 text-[10px] font-semibold text-amber-400">↑ {monthlyTrend.fogDays}</p>
                            <MiniSparkline points="0,18 18,16 36,14 54,13 72,11 100,9" stroke="#c084fc" opacityClass="opacity-30" />
                        </article>
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