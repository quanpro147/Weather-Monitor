import React, { useState } from 'react';
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Legend,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

interface DashboardOverviewProps {
    isDark?: boolean;
}

type AlertTab = 'live' | 'summary';

// --- MOCK DATA ---
const trendData = [
    { time: '00:00', tempActual: 25, tempForecast: 24.5, rainfall: 2, aqi: 68 },
    { time: '03:00', tempActual: 24, tempForecast: 24.2, rainfall: 5, aqi: 72 },
    { time: '06:00', tempActual: 26, tempForecast: 25.8, rainfall: 8, aqi: 81 },
    { time: '09:00', tempActual: 30, tempForecast: 29.6, rainfall: 14, aqi: 103 },
    { time: '12:00', tempActual: 34, tempForecast: 33.2, rainfall: 18, aqi: 128 },
    { time: '15:00', tempActual: 35, tempForecast: 34.5, rainfall: 22, aqi: 142 },
    { time: '18:00', tempActual: 32, tempForecast: 31.8, rainfall: 17, aqi: 118 },
    { time: '21:00', tempActual: 28, tempForecast: 28.4, rainfall: 10, aqi: 91 },
];

const liveAlerts = [
    {
        level: 'Critical',
        title: 'High Flood Risk - Thu Duc Sector',
        reason: 'Rainfall accumulation reached 172mm/6h and soil moisture saturation is 98%.',
        icon: 'fa-house-flood-water',
        color: 'border-red-200 dark:border-red-500/45 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400',
    },
    {
        level: 'Warning',
        title: 'Abnormal Pressure Drop - District 7',
        reason: 'Surface pressure dropped 7.8hPa within 2 hours with wind gusts at 46km/h.',
        icon: 'fa-gauge-high',
        color: 'border-orange-200 dark:border-orange-500/45 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
    },
];

const aiSummaries = [
    {
        title: '72-Hour Heat Stress Trend',
        detail: 'Model projects persistent heat index above 41C in dense urban zones from 11:00-16:00.',
        icon: 'fa-brain',
    },
    {
        title: 'AQI Recovery Window',
        detail: 'Wind corridor pattern suggests AQI can drop below 90 after midnight if rainfall remains > 8mm.',
        icon: 'fa-wind',
    },
];

export default function DashboardOverview({ isDark = true }: DashboardOverviewProps) {
    const [activeAlertTab, setActiveAlertTab] = useState<AlertTab>('live');

    const kpis = [
        { label: 'Current Temp', value: '34°C', trend: '+2.1°C vs 24h', icon: 'fa-temperature-half', color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
        { label: 'AQI Index', value: '142', trend: 'Sensitive group risk', icon: 'fa-smog', color: 'text-red-500 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
        { label: 'Humidity', value: '78%', trend: 'Slightly above avg', icon: 'fa-droplet', color: 'text-cyan-500 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
        { label: 'Rainfall 6h', value: '172mm', trend: 'Heavy precipitation', icon: 'fa-cloud-rain', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    ];

    return (
        <div className="mx-auto w-full max-w-[1500px] flex flex-col gap-6 animate-in fade-in duration-700">
            
            {/* ROW 1: Snapshot KPIs */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                {/* Large Main Weather Card */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-6 xl:col-span-5 flex flex-col justify-between transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-[#6b7280]">Main Weather</p>
                            <h3 className="mt-3 text-6xl font-black tracking-tighter text-gray-900 dark:text-[#f3f4f6]">34°C</h3>
                            <p className="mt-2 text-sm font-medium text-gray-500 dark:text-[#9ca3af]">Hot and humid, unstable pressure pattern detected.</p>
                        </div>
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/30 text-3xl text-orange-500 dark:text-orange-400 shadow-inner">
                            <i className="fa-solid fa-cloud-sun-rain"></i>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-4">
                        {[
                            { label: 'Wind', val: '24 km/h' },
                            { label: 'Pressure', val: '997 hPa' },
                            { label: 'Visibility', val: '7.4 km' }
                        ].map(item => (
                            <div key={item.label} className="bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-[#2a2a2a] p-3 text-center">
                                <p className="text-[10px] font-bold uppercase text-gray-400">{item.label}</p>
                                <p className="mt-1 text-sm font-bold text-gray-800 dark:text-[#e5e7eb]">{item.val}</p>
                            </div>
                        ))}
                    </div>
                </article>

                {/* KPI Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-7">
                    {kpis.map((kpi) => (
                        <article key={kpi.label} className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 transition-colors shadow-sm">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-[#6b7280]">{kpi.label}</p>
                                <div className={`h-10 w-10 flex items-center justify-center rounded-xl ${kpi.bg} ${kpi.color}`}>
                                    <i className={`fa-solid ${kpi.icon}`}></i>
                                </div>
                            </div>
                            <p className="mt-2 text-3xl font-black text-gray-900 dark:text-[#f3f4f6]">{kpi.value}</p>
                            <p className={`mt-1 text-xs font-bold ${kpi.color}`}>{kpi.trend}</p>
                        </article>
                    ))}
                </div>
            </div>

            {/* ROW 2: Explainable Alert & Insight Hub */}
            <section className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-6 shadow-sm">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-black tracking-tight text-gray-900 dark:text-[#f3f4f6] uppercase">Explainable Alert & Insight Hub</h3>

                    <div className="bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-[#2a2a2a] inline-flex rounded-xl p-1">
                        <button
                            type="button"
                            onClick={() => setActiveAlertTab('live')}
                            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                                activeAlertTab === 'live'
                                    ? 'bg-red-500 text-white shadow-lg'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            LIVE ALERTS
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveAlertTab('summary')}
                            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                                activeAlertTab === 'summary'
                                    ? 'bg-cyan-500 text-white shadow-lg'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            AI SUMMARY
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {activeAlertTab === 'live' ? (
                        liveAlerts.map((alert) => (
                            <article key={alert.title} className={`rounded-xl border p-5 transition-all hover:scale-[1.01] ${alert.color}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <i className={`fa-solid ${alert.icon}`}></i>
                                    <p className="text-[10px] font-black uppercase tracking-widest">{alert.level}</p>
                                </div>
                                <h4 className="text-sm font-black text-gray-900 dark:text-white">{alert.title}</h4>
                                <p className="mt-2 text-xs leading-relaxed opacity-90 font-medium">xAI Reason: {alert.reason}</p>
                            </article>
                        ))
                    ) : (
                        aiSummaries.map((insight) => (
                            <article key={insight.title} className="rounded-xl border border-cyan-100 dark:border-cyan-500/20 bg-cyan-50/30 dark:bg-cyan-500/5 p-5">
                                <div className="flex items-center gap-2 mb-2 text-cyan-600 dark:text-cyan-400">
                                    <i className={`fa-solid ${insight.icon}`}></i>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Model Insight</p>
                                </div>
                                <h4 className="text-sm font-black text-gray-900 dark:text-white">{insight.title}</h4>
                                <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-cyan-100/70 font-medium">{insight.detail}</p>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* ROW 3: Charts & Maps */}
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                {/* Geospatial Map */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-6 xl:col-span-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-black text-gray-900 dark:text-[#f3f4f6] uppercase tracking-wider">Geospatial Map</h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Vietnam Region</span>
                    </div>
                    <div className="relative h-[340px] overflow-hidden rounded-xl border border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#151515] flex items-center justify-center">
                         {/* Map Grid Pattern */}
                        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                        <i className="fa-solid fa-map-location-dot text-6xl text-gray-200 dark:text-[#252830]"></i>
                        <div className="absolute bottom-4 left-4 rounded-lg bg-gray-900/80 px-3 py-2 text-[10px] font-bold text-white backdrop-blur-sm">
                            MAP INTERFACE PLACEHOLDER
                        </div>
                    </div>
                </article>

                {/* Multi-variable Analytics Chart */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-6 xl:col-span-7 shadow-sm">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="text-sm font-black text-gray-900 dark:text-[#f3f4f6] uppercase tracking-wider">Multi-variable Analytics</h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Dual Y-axis Overlay</span>
                    </div>

                    <div className="h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData} margin={{ top: 5, right: -10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#2d3238" : "#e2e8f0"} vertical={false} />
                                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? '#171717' : '#ffffff',
                                        border: `1px solid ${isDark ? '#2a2a2a' : '#e2e8f0'}`,
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }} />

                                <Area yAxisId="right" type="monotone" dataKey="rainfall" name="Rain (mm)" stroke="#0ea5e9" fill="url(#rainFill)" strokeWidth={2} />
                                <Line yAxisId="left" type="monotone" dataKey="tempActual" name="Temp Actual" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316' }} />
                                <Line yAxisId="left" type="monotone" dataKey="tempForecast" name="Temp Forecast" stroke="#fdba74" strokeDasharray="5 5" strokeWidth={2} dot={false} opacity={0.6} />
                                <Line yAxisId="right" type="monotone" dataKey="aqi" name="AQI" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </article>
            </section>
        </div>
    );
}