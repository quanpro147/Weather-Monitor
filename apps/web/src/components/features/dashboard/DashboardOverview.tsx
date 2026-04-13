import React, { useEffect, useState } from 'react';
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
import dynamic from 'next/dynamic';
import KpiGrid from '../kpi-matrix/KpiGrid';
import type { MapDataPoint } from '../../features/geospatial-map/InteractiveMap';
import { useAnomalyData } from '../../../hooks/useAnomalyData';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { useWeatherData } from '../../../hooks/useWeatherData';
import { listCities } from '../../../services/city.service';
import { getCurrentWeather, getWeatherAdvisory } from '../../../services/weather.service';
import type { AdvisoryResponse, WeatherDaily } from '../../../types/weather';

// Định nghĩa kiểu dữ liệu cho Props của Map để tránh lỗi TypeScript
interface InteractiveMapProps {
    isDark?: boolean;
    data: MapDataPoint[];
    isLoading?: boolean;
    error?: string | null;
}

// Bắt buộc dùng Dynamic Import tắt SSR cho Leaflet Map
const InteractiveMap = dynamic<InteractiveMapProps>(
    () => import('../../features/geospatial-map/InteractiveMap'),
    { 
        ssr: false, 
        loading: () => <div className="h-full w-full animate-pulse bg-gray-100 dark:bg-[#151515] rounded-xl" /> 
    }
);

interface DashboardOverviewProps {
    isDark?: boolean;
}

type AlertTab = 'live' | 'summary';

type WeatherWithOptionalRealtime = WeatherDaily & {
    aqi?: number | null;
    air_quality_index?: number | null;
    pressure?: number | null;
    visibility?: number | null;
    temperature?: number | null;
    wind_speed?: number | null;
    precipitation?: number | null;
};

// Hàm định dạng số liệu, trả về '--' nếu missing data
function formatNumber(value: number | null | undefined, digits = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '--';
    }
    return value.toFixed(digits);
}

function resolveTempDelta(current: WeatherDaily | null, history: WeatherDaily[]): string {
    if (!current || history.length < 2) {
        return 'No trend baseline';
    }

    const prev = history[history.length - 2]?.temperature_2m_max;
    const now = current.temperature_2m_max;

    if (prev === null || prev === undefined || now === null || now === undefined) {
        return 'No trend baseline';
    }

    const diff = now - prev;
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${diff.toFixed(1)}°C vs previous day`;
}

// Mock Data cho hệ thống AI Insights
const aiSummaries = [
    {
        title: '72-Hour Heat Stress Trend',
        detail: 'Model projects persistent heat index above 41°C in dense urban zones from 11:00-16:00.',
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
    const [chartReady, setChartReady] = useState(false);
    
    // API Hooks
    const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
    const [advisoryLoading, setAdvisoryLoading] = useState(false);
    const [advisoryError, setAdvisoryError] = useState<string | null>(null);
    const [mapData, setMapData] = useState<MapDataPoint[]>([]);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    
    const { cityId, startDate, endDate } = useGlobalFilter();
    const {
        current,
        history,
        isLoading: weatherLoading,
        error: weatherError,
    } = useWeatherData({ cityId, startDate, endDate, enabled: cityId !== null });
    const {
        anomalyCount,
        isLoading: anomalyLoading,
    } = useAnomalyData({ cityId, startDate, endDate, enabled: cityId !== null });

    // Đảm bảo chart chỉ render trên client
    useEffect(() => {
        setChartReady(true);
    }, []);

    useEffect(() => {
        let active = true;

        const loadMapData = async () => {
            setMapLoading(true);
            setMapError(null);

            try {
                const cities = await listCities();
                const citySlice = cities.slice(0, 25);

                const currentResults = await Promise.allSettled(
                    citySlice.map(async (city) => {
                        const currentWeather = (await getCurrentWeather(city.city_id)) as WeatherWithOptionalRealtime;
                        return { city, currentWeather };
                    }),
                );

                if (!active) {
                    return;
                }

                const nextMapData: MapDataPoint[] = currentResults.flatMap((result) => {
                    if (result.status !== 'fulfilled') {
                        return [];
                    }

                    const payload = result.value;
                    return [
                        {
                            id: payload.city.city_id,
                            city: payload.city.city,
                            lat: payload.city.latitude,
                            lng: payload.city.longitude,
                            // Missing metrics MUST remain null and never be forced to 0.
                            temp: payload.currentWeather.temperature_2m_max ?? payload.currentWeather.temperature_2m_mean ?? null,
                            aqi: payload.currentWeather.air_quality_index ?? payload.currentWeather.aqi ?? null,
                            rain: payload.currentWeather.precipitation ?? payload.currentWeather.rain_sum ?? null,
                        },
                    ];
                });

                setMapData(nextMapData);

                if (nextMapData.length === 0) {
                    setMapError('No valid station payload returned from backend.');
                }
            } catch (err) {
                if (!active) {
                    return;
                }
                setMapData([]);
                setMapError(err instanceof Error ? err.message : 'Failed to load geospatial map data');
            } finally {
                if (active) {
                    setMapLoading(false);
                }
            }
        };

        void loadMapData();

        return () => {
            active = false;
        };
    }, [cityId]);

    // Fetch Advisory Data
    useEffect(() => {
        let active = true;
        const loadAdvisory = async () => {
            if (cityId === null) {
                setAdvisory(null);
                setAdvisoryError(null);
                return;
            }

            setAdvisoryLoading(true);
            setAdvisoryError(null);

            try {
                const nextAdvisory = await getWeatherAdvisory(cityId);
                if (!active) return;
                setAdvisory(nextAdvisory);
            } catch (err) {
                if (!active) return;
                setAdvisory(null);
                setAdvisoryError(err instanceof Error ? err.message : 'Failed to load advisory data');
            } finally {
                if (active) setAdvisoryLoading(false);
            }
        };

        void loadAdvisory();
        return () => { active = false; };
    }, [cityId]);

    // Data Mapping
    const realtime = (current ?? null) as WeatherWithOptionalRealtime | null;
    const mainTemp = realtime?.temperature ?? current?.temperature_2m_max ?? current?.temperature_2m_mean;
    const windSpeed = realtime?.wind_speed ?? current?.wind_speed_10m_max;
    const pressure = realtime?.pressure ?? null;
    const visibility = realtime?.visibility ?? null;
    const aqi = realtime?.air_quality_index ?? realtime?.aqi ?? null;

    // Chuẩn bị dữ liệu cho Chart: Giữ nguyên giá trị null nếu AQI không có dữ liệu
    const trendData = history.slice(-12).map((item) => {
        const itemRealtime = item as WeatherWithOptionalRealtime;
        const tempActual = itemRealtime.temperature ?? item.temperature_2m_max ?? item.temperature_2m_mean ?? 0;
        return {
            time: item.date?.slice(5) ?? '--',
            tempActual,
            tempForecast: item.temperature_2m_mean ?? tempActual,
            rainfall: item.rain_sum ?? 0,
            aqi: itemRealtime.aqi ?? null, // FIXED: Trả về null thay vì 0 để tránh sai lệch biểu đồ
        };
    });

    const backendDataState = weatherLoading || anomalyLoading || advisoryLoading
        ? 'Loading live backend data...'
        : weatherError || advisoryError
            ? `Data error: ${weatherError ?? advisoryError}`
            : `Live mode: ${formatNumber(mainTemp)}°C, anomalies ${anomalyCount}`;

    const mainCondition = advisory?.advice_text ?? 'No advisory message available from backend.';
    const tempTrend = resolveTempDelta(current, history);

    return (
        <div className="mx-auto w-full max-w-[1500px] flex flex-col gap-4 animate-in fade-in duration-700">
            {/* Global Status Bar */}
            <div className="rounded-xl border border-[#2a2a2a] bg-[#151515] px-4 py-2 text-xs font-semibold text-[#d1d5db]">
                {backendDataState}
            </div>
            
            {/* ROW 1: Snapshot KPIs */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                {/* Large Main Weather Card */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 xl:col-span-5 flex flex-col justify-between transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-[#6b7280] mb-1">Main Weather</p>
                            <h3 className="text-6xl font-black tracking-tighter text-gray-900 dark:text-[#f3f4f6] leading-none">
                                {formatNumber(mainTemp)}°C
                            </h3>
                            <p className="mt-2 text-xs font-medium text-gray-500 dark:text-[#9ca3af]">{mainCondition}</p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/30 text-2xl text-orange-500 dark:text-orange-400 shadow-inner">
                            <i className="fa-solid fa-cloud-sun-rain"></i>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                        {[
                            { label: 'Wind', val: `${formatNumber(windSpeed)} km/h` },
                            { label: 'Pressure', val: `${formatNumber(pressure, 0)} hPa` },
                            { label: 'Visibility', val: `${formatNumber(visibility)} km` }
                        ].map(item => (
                            <div key={item.label} className="bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-[#2a2a2a] p-3 text-center flex flex-col justify-center">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400 leading-tight">{item.label}</p>
                                <p className="mt-0.5 text-sm font-bold text-gray-800 dark:text-[#e5e7eb] leading-tight">{item.val}</p>
                            </div>
                        ))}
                    </div>
                </article>

                {/* KPI Grid (External Component) */}
                <KpiGrid
                    current={current}
                    history={history}
                    advisory={advisory}
                    isLoading={weatherLoading || advisoryLoading}
                    error={weatherError ?? advisoryError}
                />
            </div>

            {/* ROW 2: Explainable Alert & Insight Hub */}
            <section className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-sm font-black tracking-widest text-gray-900 dark:text-[#f3f4f6] uppercase">Explainable Alert & Insight Hub</h3>

                    <div className="bg-gray-100 dark:bg-[#151515] border border-gray-200 dark:border-[#2a2a2a] inline-flex rounded-lg p-1">
                        <button
                            type="button"
                            onClick={() => setActiveAlertTab('live')}
                            className={`rounded-md px-3 py-1.5 text-[10px] font-bold tracking-widest transition-all ${
                                activeAlertTab === 'live'
                                    ? 'bg-red-500 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            LIVE ALERTS
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveAlertTab('summary')}
                            className={`rounded-md px-3 py-1.5 text-[10px] font-bold tracking-widest transition-all ${
                                activeAlertTab === 'summary'
                                    ? 'bg-cyan-500 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            AI SUMMARY
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {activeAlertTab === 'live' ? (
                        [
                            {
                                level: advisory?.risk_level ? advisory.risk_level.toUpperCase() : 'INFO',
                                title: 'Live Weather Advisory',
                                reason: advisory?.advice_text ?? 'No advisory available.',
                                icon: 'fa-bell',
                                color: 'border-orange-200 dark:border-orange-500/45 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
                            },
                            {
                                level: anomalyCount > 0 ? 'WARNING' : 'NORMAL',
                                title: 'Anomaly Detection Status',
                                reason: anomalyCount > 0
                                    ? `${anomalyCount} anomaly records in selected range ${startDate} -> ${endDate}.`
                                    : `No anomalies detected in selected range ${startDate} -> ${endDate}.`,
                                icon: 'fa-triangle-exclamation',
                                color: anomalyCount > 0 ? 'border-red-200 dark:border-red-500/45 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 text-gray-500 dark:text-gray-400',
                            },
                        ].map((alert) => (
                            <article key={alert.title} className={`rounded-xl border p-4 transition-all hover:scale-[1.01] ${alert.color}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <i className={`fa-solid ${alert.icon} text-[10px]`}></i>
                                    <p className="text-[9px] font-black uppercase tracking-widest leading-none">{alert.level}</p>
                                </div>
                                <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight">{alert.title}</h4>
                                <p className="mt-1 text-[10px] leading-relaxed opacity-90 font-medium">xAI Reason: {alert.reason}</p>
                            </article>
                        ))
                    ) : (
                        [
                            {
                                title: 'Current Temperature Delta',
                                detail: tempTrend,
                                icon: 'fa-temperature-half',
                            },
                            {
                                title: 'AQI / Humidity Signal',
                                detail: `AQI ${formatNumber(aqi, 0)} | Humidity ${formatNumber(current?.relative_humidity_2m_mean, 0)}% | Rain ${formatNumber(current?.rain_sum)} mm`,
                                icon: 'fa-wind',
                            },
                        ].map((insight) => (
                            <article key={insight.title} className="rounded-xl border border-cyan-100 dark:border-cyan-500/20 bg-cyan-50/30 dark:bg-cyan-500/5 p-4">
                                <div className="flex items-center gap-2 mb-1.5 text-cyan-600 dark:text-cyan-400">
                                    <i className={`fa-solid ${insight.icon} text-[10px]`}></i>
                                    <p className="text-[9px] font-black uppercase tracking-widest leading-none">Model Insight</p>
                                </div>
                                <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight">{insight.title}</h4>
                                <p className="mt-1 text-[10px] leading-relaxed text-gray-600 dark:text-cyan-100/70 font-medium">{insight.detail}</p>
                            </article>
                        ))
                    )}
                </div>
            </section>

            {/* ROW 3: Charts & Maps */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                {/* Geospatial Map */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 xl:col-span-5 shadow-sm flex flex-col">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-black text-gray-900 dark:text-[#f3f4f6] uppercase tracking-wider">Geospatial Map</h3>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Vietnam Region</span>
                    </div>
                    <div className="relative flex-1 min-h-[300px] overflow-hidden rounded-xl border border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#151515] flex items-center justify-center">
                        <InteractiveMap isDark={isDark} data={mapData} isLoading={mapLoading} error={mapError} />
                    </div>
                </article>

                {/* Multi-variable Analytics Chart */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 xl:col-span-7 shadow-sm flex flex-col min-w-0">
                    <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-black text-gray-900 dark:text-[#f3f4f6] uppercase tracking-wider">Multi-variable Analytics</h3>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Dual Y-axis Overlay</span>
                    </div>

                    <div className="flex-1 min-h-[300px] w-full min-w-0">
                        {chartReady ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData.length > 0 ? trendData : [{ time: '--', tempActual: 0, tempForecast: 0, rainfall: 0, aqi: null }]} margin={{ top: 5, right: -10, left: -25, bottom: 0 }}>
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
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />

                                <Area yAxisId="right" type="monotone" dataKey="rainfall" name="Rain (mm)" stroke="#0ea5e9" fill="url(#rainFill)" strokeWidth={2} />
                                <Line yAxisId="left" type="monotone" dataKey="tempActual" name="Temp Actual" stroke="#f97316" strokeWidth={3} dot={{ r: 3, fill: '#f97316' }} />
                                <Line yAxisId="left" type="monotone" dataKey="tempForecast" name="Temp Forecast" stroke="#fdba74" strokeDasharray="4 4" strokeWidth={2} dot={false} opacity={0.6} />
                                
                                {/* Missing AQI remains null; connectNulls=false to show signal break explicitly. */}
                                <Line yAxisId="right" type="monotone" dataKey="aqi" name="AQI" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                        ) : (
                        <div className="h-full w-full animate-pulse rounded-lg bg-gray-100 dark:bg-[#151515]" />
                        )}
                    </div>
                </article>
            </section>
        </div>
    );
}