import React from 'react';
import useSWR from 'swr';
import {
    ResponsiveContainer,
    ComposedChart,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    Line,
    Area,
} from 'recharts';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { useAnomalyData } from '../../../hooks/useAnomalyData';
import { useWeatherData } from '../../../hooks/useWeatherData';
import { useWeatherClassification } from '../../../hooks/useWeatherClassification';
import { listCities } from '../../../services/city.service';
import { getWeatherAdvisory } from '../../../services/weather.service';
import { getForecast } from '../../../services/forecast.service';
import type { AdvisoryResponse } from '../../../types/weather';
import type { City } from '../../../types/city';
import AiSummaryPanel from './AiSummaryPanel';
import AnomalyScatterChart from './AnomalyScatterChart';
import type { ScatterPoint } from './AnomalyScatterChart';
import AnomalyTimeline from './AnomalyTimeline';
import AlertList from './AlertList';
import WeatherClassificationPanel from './WeatherClassificationPanel';

export default function InsightsView() {
    const { isDark } = useTheme();
    const { cityId, scopeMode, startDate, endDate, setCityId } = useGlobalFilter();
    const [advisory, setAdvisory] = React.useState<AdvisoryResponse | null>(null);
    const [advisoryLoading, setAdvisoryLoading] = React.useState(false);
    const [advisoryError, setAdvisoryError] = React.useState<string | null>(null);
    const [chartReady, setChartReady] = React.useState(false);

    React.useEffect(() => {
        const id = setTimeout(() => setChartReady(true), 100);
        return () => clearTimeout(id);
    }, []);

    /* ── City list — share cache key with StationsView but include own fetcher
         so this page works even when StationsView has never been visited.    */
    const { data: cities } = useSWR<City[]>(
        `stations:cities:${scopeMode}`,
        async () => {
            if (scopeMode === 'vietnam') {
                const data = await listCities({ country: 'Viet Nam', limit: 200 });
                return data.length > 0 ? data : listCities({ country: 'Vietnam', limit: 200 });
            }
            return listCities({ limit: 1000 });
        },
        { revalidateOnFocus: false, dedupingInterval: 300_000 },
    );

    /* ── Anomaly data ────────────────────────────────────────────────────── */
    const {
        records: anomalyRecords,
        isLoading: anomalyLoading,
        error: anomalyError,
    } = useAnomalyData({
        cityId,
        startDate,
        endDate,
        enabled: cityId !== null,
    });

    /* ── Weather history ─────────────────────────────────────────────────── */
    const {
        history,
        isLoading: weatherLoading,
        error: weatherError,
    } = useWeatherData({
        cityId,
        startDate,
        endDate,
        enabled: cityId !== null,
    });

    /* ── Forecast (7-day) ────────────────────────────────────────────────── */
    const { data: forecastData } = useSWR(
        cityId !== null ? `forecast:${cityId}` : null,
        () => getForecast(cityId as number, 7),
        { revalidateOnFocus: false, dedupingInterval: 3_600_000 },
    );

    /* ── Weather classification (bulk) ───────────────────────────────────── */
    const {
        distribution,
        totalCities,
        isLoading: classificationLoading,
        error: classificationError,
    } = useWeatherClassification(cities ?? []);

    /* ── Scatter chart data ──────────────────────────────────────────────── */
    const scatterChartData = React.useMemo<ScatterPoint[]>(() => {
        if (history.length === 0) return [];

        const anomalyByDate = new Map(anomalyRecords.map((r) => [r.date, r]));

        return history
            .map((dayData) => {
                const temp = dayData.temperature_2m_max ?? dayData.temperature_2m_mean ?? dayData.temperature_2m_min;
                const humidity = dayData.relative_humidity_2m_mean;
                if (temp === null || temp === undefined || humidity === null || humidity === undefined) return null;

                const anomalyDetail = anomalyByDate.get(dayData.date);
                return {
                    temp,
                    humidity,
                    is_anomaly: anomalyDetail?.is_anomaly ?? false,
                    anomaly_score: anomalyDetail?.anomaly_score ?? 0,
                    date: dayData.date,
                };
            })
            .filter((item): item is ScatterPoint => item !== null);
    }, [anomalyRecords, history]);

    /* ── Forecast chart data: merge history + forecast ───────────────────── */
    const forecastChartData = React.useMemo(() => {
        const histPoints = history.map((h) => ({
            date: h.date.slice(5),         // MM-DD
            actual: h.temperature_2m_mean,
            forecast: null as number | null,
            lower: null as number | null,
            upper: null as number | null,
        }));

        const fcPoints = (forecastData ?? []).map((f) => ({
            date: f.date.slice(5),
            actual: null as number | null,
            forecast: f.predicted_temperature,
            lower: f.confidence_lower,
            upper: f.confidence_upper,
        }));

        return [...histPoints, ...fcPoints];
    }, [history, forecastData]);

    /* ── Advisory ────────────────────────────────────────────────────────── */
    React.useEffect(() => {
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
                const next = await getWeatherAdvisory(cityId);
                if (active) setAdvisory(next);
            } catch (err) {
                if (active) {
                    setAdvisory(null);
                    setAdvisoryError(err instanceof Error ? err.message : 'Failed to load advisory');
                }
            } finally {
                if (active) setAdvisoryLoading(false);
            }
        };
        void loadAdvisory();
        return () => { active = false; };
    }, [cityId]);

    const surface = `rounded-2xl border shadow-sm ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`;
    const heading = `text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`;
    const subheading = `text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`;

    return (
        <div className="mx-auto w-full max-w-[1500px] flex flex-col gap-6 animate-in fade-in duration-700">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className={`text-xl font-black tracking-tight ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>
                        AI Insights &amp; Diagnostics
                    </h2>
                    <p className={`text-xs font-medium mt-1 ${isDark ? 'text-[#9ca3af]' : 'text-gray-500'}`}>
                        Powered by Gemini 2.5 Flash &amp; Isolation Forest ML
                    </p>
                </div>
            </div>

            {cityId === null && (
                <div className={`rounded-xl border p-3 text-sm ${isDark ? 'border-[#2a2d33] text-gray-300 bg-[#1e1e1e]' : 'border-gray-200 text-gray-700 bg-white'}`}>
                    Chọn thành phố từ bộ lọc trên cùng để xem AI Insight và Anomaly Diagnostics.
                </div>
            )}

            {/* ── ROW 0: Weather Classification Overview (bulk, scope-wide) ── */}
            <section className={`p-6 ${surface}`}>
                <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-layer-group text-cyan-500 text-xs" />
                    <h3 className={heading}>Weather Classification Overview</h3>
                    <span className={`ml-auto text-[9px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                        {scopeMode === 'vietnam' ? 'Vietnam scope' : 'Global scope'}
                    </span>
                </div>
                <WeatherClassificationPanel
                    distribution={distribution}
                    totalCities={totalCities}
                    isLoading={classificationLoading}
                    error={classificationError}
                    onCityClick={(id) => setCityId(id)}
                />
            </section>

            {/* ── ROW 1: LLM Summary ───────────────────────────────────────── */}
            <section className={`p-6 ${surface}`}>
                <div className="flex items-center gap-2 mb-4">
                    <i className="fa-solid fa-wand-magic-sparkles text-cyan-500" />
                    <h3 className={heading}>LLM Weather Summary</h3>
                </div>
                <AiSummaryPanel cityId={cityId} />
            </section>

            {/* ── ROW 2: Scatter + xAI Timeline ────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <section className={`p-6 ${surface} xl:col-span-7 flex flex-col`}>
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h3 className={heading}>Isolation Forest Analysis</h3>
                            <p className={subheading}>Outlier detection visualization</p>
                        </div>
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-[#151515] rounded-xl border border-gray-100 dark:border-[#2a2a2a] p-2">
                        <AnomalyScatterChart data={scatterChartData} />
                    </div>
                </section>

                <section className={`p-6 ${surface} xl:col-span-5 flex flex-col`}>
                    <div className="mb-6">
                        <h3 className={heading}>Explainable AI (xAI) Log</h3>
                        <p className={subheading}>Why anomalies were flagged</p>
                    </div>
                    <div className="flex-1">
                        <AnomalyTimeline records={anomalyRecords} />
                    </div>
                </section>
            </div>

            {/* ── ROW 3: Forecast Chart ─────────────────────────────────────── */}
            <section className={`p-6 ${surface}`}>
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className={heading}>7-Day Temperature Forecast</h3>
                        <p className={subheading}>
                            Historical trend + Holt Double Exponential Smoothing forecast with ±1σ confidence band
                        </p>
                    </div>
                    {forecastData && forecastData.length > 0 && (
                        <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                            Method: {forecastData[0].method}
                        </span>
                    )}
                </div>

                {cityId === null ? (
                    <div className={`flex items-center justify-center h-40 rounded-xl border ${isDark ? 'border-[#2a2a2a] bg-[#151515] text-gray-600' : 'border-gray-100 bg-gray-50 text-gray-400'}`}>
                        <p className="text-xs font-semibold">Chọn thành phố để xem biểu đồ dự báo</p>
                    </div>
                ) : !chartReady || (weatherLoading && forecastChartData.length === 0) ? (
                    <div className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-[#151515]" />
                ) : (
                    <div className="h-72 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={forecastChartData}
                                margin={{ top: 5, right: -10, left: -25, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={isDark ? '#2d3238' : '#e2e8f0'}
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={Math.max(0, Math.ceil(forecastChartData.length / 8) - 1)}
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={['auto', 'auto']}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? '#171717' : '#ffffff',
                                        border: `1px solid ${isDark ? '#2a2a2a' : '#e2e8f0'}`,
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                    }}
                                    formatter={(value: number | null, name: string) => {
                                        if (value === null) return ['-', name];
                                        return [`${value.toFixed(1)}°C`, name];
                                    }}
                                />
                                <Legend
                                    iconType="circle"
                                    wrapperStyle={{
                                        paddingTop: '10px',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        color: isDark ? '#e5e7eb' : '#374151',
                                    }}
                                />

                                {/* Confidence band — upper bound as area */}
                                <Area
                                    type="monotone"
                                    dataKey="upper"
                                    name="Confidence Upper"
                                    stroke="none"
                                    fill="url(#forecastBand)"
                                    legendType="none"
                                    connectNulls={false}
                                />

                                {/* Actual historical temperature */}
                                <Line
                                    type="monotone"
                                    dataKey="actual"
                                    name="Actual Temp"
                                    stroke="#f97316"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#f97316' }}
                                    connectNulls={false}
                                />

                                {/* Forecast line — dashed */}
                                <Line
                                    type="monotone"
                                    dataKey="forecast"
                                    name="Forecast"
                                    stroke="#a78bfa"
                                    strokeDasharray="5 5"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#a78bfa' }}
                                    connectNulls={false}
                                />

                                {/* Lower confidence bound */}
                                <Line
                                    type="monotone"
                                    dataKey="lower"
                                    name="Confidence Lower"
                                    stroke="#a78bfa"
                                    strokeDasharray="2 4"
                                    strokeWidth={1}
                                    dot={false}
                                    legendType="none"
                                    connectNulls={false}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </section>

            {/* ── ROW 4: Live Alert Stream ──────────────────────────────────── */}
            <section className={`p-6 ${surface}`}>
                <div className="mb-4">
                    <h3 className={heading}>Live Alert Stream</h3>
                    <p className={subheading}>Rule-based advisory + top anomaly signals</p>
                </div>
                <AlertList
                    advisory={advisory}
                    records={anomalyRecords}
                    isLoading={advisoryLoading || anomalyLoading || weatherLoading}
                    error={advisoryError ?? anomalyError ?? weatherError}
                />
            </section>
        </div>
    );
}