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
import { getForecast } from '../../../services/forecast.service';
import { getCurrentWeatherBulk, getWeatherAdvisory } from '../../../services/weather.service';
import type { AnomalyRecord } from '../../../types/anomaly';
import type { AdvisoryResponse, WeatherDaily } from '../../../types/weather';

interface InteractiveMapProps {
    isDark?: boolean;
    data: MapDataPoint[];
    isLoading?: boolean;
    error?: string | null;
    scopeMode?: 'vietnam' | 'global';
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

type WeatherWithOptionalRealtime = WeatherDaily & {
    aqi?: number | null;
    air_quality_index?: number | null;
    pressure?: number | null;
    visibility?: number | null;
    temperature?: number | null;
    wind_speed?: number | null;
    precipitation?: number | null;
};

interface ForecastTrend {
    date: string;
    predicted_temperature: number;
}

type ChartAnomalyRecord = Pick<AnomalyRecord, 'date' | 'is_anomaly'>;
// ------------------------------------------------

// Hàm định dạng số liệu, trả về '--' nếu missing data
function formatNumber(value: number | null | undefined, digits = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return '--';
    }
    return value.toFixed(digits);
}

export default function DashboardOverview({ isDark = true }: DashboardOverviewProps) {
    const [chartReady, setChartReady] = useState(false);
    
    // --- KHAI BÁO STATE CHO TÍNH NĂNG MỚI MÀ NHÁNH FEAT ĐANG THIẾU ---
    const [forecastList, setForecastList] = useState<ForecastTrend[]>([]);
    const [anomalyList, setAnomalyList] = useState<ChartAnomalyRecord[]>([]);
    // ----------------------------------------------------------------
    
    // API Hooks
    const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null);
    const [advisoryLoading, setAdvisoryLoading] = useState(false);
    const [advisoryError, setAdvisoryError] = useState<string | null>(null);
    const [mapData, setMapData] = useState<MapDataPoint[]>([]);
    const [mapLoading, setMapLoading] = useState(false);
    const [mapError, setMapError] = useState<string | null>(null);
    
    const { cityId, scopeMode, startDate, endDate, setLastUpdatedDate } = useGlobalFilter();
    const {
        current,
        history,
        isLoading: weatherLoading,
        error: weatherError,
    } = useWeatherData({ cityId, startDate, endDate, enabled: cityId !== null });
    const {
        records: anomalyRecords,
        anomalyCount,
    } = useAnomalyData({ cityId, startDate, endDate, enabled: cityId !== null });

    // Đảm bảo chart chỉ render trên client
    useEffect(() => {
        setChartReady(true);
    }, []);

    useEffect(() => {
        if (current?.date) {
            setLastUpdatedDate(current.date);
        }
    }, [current?.date, setLastUpdatedDate]);

    useEffect(() => {
        let active = true;

        const loadMapData = async () => {
            setMapLoading(true);
            setMapError(null);

            try {
                let cities;
                if (scopeMode === 'vietnam') {
                    const vnByCanonical = await listCities({ country: 'Viet Nam' });
                    cities = vnByCanonical.length > 0 ? vnByCanonical : await listCities({ country: 'Vietnam' });
                } else {
                    cities = await listCities({ limit: 200 });
                }
                const citySlice = cities.slice(0, 25);
                const currentRows = await getCurrentWeatherBulk(citySlice.map((city) => city.city_id));
                const currentByCityId = new Map<number, WeatherWithOptionalRealtime>(
                    currentRows.map((item) => [item.city_id, item as WeatherWithOptionalRealtime]),
                );

                if (!active) {
                    return;
                }

                const nextMapData: MapDataPoint[] = citySlice.flatMap((city) => {
                    const currentWeather = currentByCityId.get(city.city_id);
                    if (!currentWeather) {
                        return [];
                    }

                    return [
                        {
                            id: city.city_id,
                            city: city.city,
                            lat: city.latitude,
                            lng: city.longitude,
                            // Missing metrics MUST remain null and never be forced to 0.
                            temp: currentWeather.temperature_2m_max ?? currentWeather.temperature_2m_mean ?? null,
                            aqi: currentWeather.air_quality_index ?? currentWeather.aqi ?? null,
                            rain: currentWeather.precipitation ?? currentWeather.rain_sum ?? null,
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
    }, [cityId, scopeMode]);

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

    // Fetch Forecast cho biểu đồ (Anomaly dùng trực tiếp từ hook useAnomalyData)
    useEffect(() => {
        let active = true;

        const loadForecast = async () => {
            if (cityId === null) {
                setForecastList([]);
                return;
            }

            try {
                const trends = await getForecast(cityId, 7);
                if (!active) {
                    return;
                }
                setForecastList(trends);
            } catch {
                if (!active) {
                    return;
                }
                setForecastList([]);
            }
        };

        void loadForecast();

        return () => {
            active = false;
        };
    }, [cityId]);

    useEffect(() => {
        if (cityId === null) {
            setAnomalyList([]);
            return;
        }

        setAnomalyList(
            anomalyRecords.map((item) => ({
                date: item.date,
                is_anomaly: item.is_anomaly,
            }))
        );
    }, [cityId, anomalyRecords]);

    // Data Mapping
    const realtime = (current ?? null) as WeatherWithOptionalRealtime | null;
    const mainTemp = realtime?.temperature ?? current?.temperature_2m_max ?? current?.temperature_2m_mean;
    const windSpeed = realtime?.wind_speed ?? current?.wind_speed_10m_max;
    const pressure = realtime?.pressure ?? null;
    const visibility = realtime?.visibility ?? null;
    const aqi = realtime?.air_quality_index ?? realtime?.aqi ?? null;

    // Chuẩn bị dữ liệu cho Chart: Hợp nhất Lịch sử + Bất thường + Dự báo
    const historyData = history.map((item) => {
        const itemRealtime = item as WeatherWithOptionalRealtime;
        const tempActual = itemRealtime.temperature ?? item.temperature_2m_max ?? item.temperature_2m_mean ?? 0;
        
        // Kiểm tra xem ngày này có bị ML model đánh dấu bất thường không
        const isAnomaly = anomalyList.some(a => a.date === item.date && a.is_anomaly);

        return {
            time: item.date?.slice(5) ?? '--',
            tempActual: tempActual,
            anomalyTemp: isAnomaly ? tempActual : null, // Gắn mồi để vẽ điểm đỏ
            tempForecast: null, // Quá khứ không có đường dự báo
            rainfall: item.rain_sum ?? 0,
            aqi: itemRealtime.aqi ?? null,
        };
    });

    const lastHistoryDate = history.length > 0 ? history[history.length - 1].date : null;
    const forecastData = forecastList
        .filter((f) => !lastHistoryDate || f.date > lastHistoryDate)
        .map((f) => ({
            time: f.date.slice(5),
            tempActual: null,
            anomalyTemp: null,
            tempForecast: f.predicted_temperature,
            rainfall: null, // Tương lai không có dữ liệu mưa thực -> không vẽ đường xanh cho ngày dự báo
            aqi: null,
        }));

    // Gắn mép: Nối điểm cuối của lịch sử với điểm đầu của dự báo để đường không bị đứt quãng
    if (historyData.length > 0 && forecastData.length > 0) {
        historyData[historyData.length - 1].tempForecast = historyData[historyData.length - 1].tempActual;
    }

    // Gộp mảng quá khứ và tương lai lại làm một đường thẳng băng
    const trendData = [...historyData, ...forecastData];

    const mainCondition = advisory?.advice_text ?? 'No advisory message available from backend.';

    return (
        <div className="mx-auto w-full max-w-[1500px] flex flex-col gap-4 animate-in fade-in duration-700">
            {/* ROW 1: Snapshot KPIs */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                {/* Large Main Weather Card */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 xl:col-span-5 flex flex-col justify-between transition-colors shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-[#6b7280] mb-1">Thời Tiết Hôm Nay (Today's Conditions)</p>
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
                            { label: 'Tốc Độ Gió', val: `${formatNumber(windSpeed)} km/h` },
                            { label: 'Áp Suất Khí Quyển', val: `${formatNumber(pressure, 0)} hPa` },
                            { label: 'Tầm Nhìn Xa', val: `${formatNumber(visibility)} km` }
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

            {/* ROW 1.5: 5-Day Forecast Strip */}
            <section className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-4 shadow-sm">
                <div className="mb-3">
                    <h3 className="text-xs font-black text-gray-900 dark:text-[#f3f4f6] uppercase tracking-wider">Dự Báo 5 Ngày Tới (5-Day Forecast)</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {current && (
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#151515] py-4 px-2">
                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">Hôm Nay</p>
                            <i className={`fa-solid ${(current.rain_sum ?? 0) > 5 ? 'fa-cloud-rain text-blue-400' : (current.temperature_2m_max ?? 0) > 35 ? 'fa-sun text-orange-400' : 'fa-cloud-sun text-yellow-400'} text-3xl`}></i>
                            <p className="text-xl font-black text-orange-500">{current.temperature_2m_max !== null && current.temperature_2m_max !== undefined ? `${Math.round(current.temperature_2m_max)}°` : '--'}</p>
                            <p className="text-xs font-semibold text-gray-400">{current.temperature_2m_min !== null && current.temperature_2m_min !== undefined ? `${Math.round(current.temperature_2m_min)}°` : '--'}</p>
                        </div>
                    )}
                    {forecastList.slice(0, 4).map((f) => {
                        const parts = f.date.split('-');
                        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                        const dayLabel = `${ ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] } ${d.getDate()}`;
                        const iconClass = f.predicted_temperature > 35 ? 'fa-sun text-orange-400' : 'fa-cloud-sun text-yellow-400';
                        return (
                            <div key={f.date} className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#151515] py-4 px-2">
                                <p className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{dayLabel}</p>
                                <i className={`fa-solid ${iconClass} text-3xl`}></i>
                                <p className="text-xl font-black text-orange-500">{Math.round(f.predicted_temperature + 1)}°</p>
                                <p className="text-xs font-semibold text-gray-400">{Math.round(f.predicted_temperature - 1)}°</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ROW 2: Alert */}
            <section className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 shadow-sm">
                <div className="mb-4">
                    <h3 className="text-sm font-black tracking-widest text-gray-900 dark:text-[#f3f4f6] uppercase">Trung Tâm Khuyến Nghị & Cảnh Báo Dị Biệt (Advisory & Anomalies)</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Nơi hiển thị thông tin khuyến nghị thời tiết trực tiếp và trạng thái phát hiện dị biệt bằng AI.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {[
                        {
                            level: advisory?.risk_level ? (
                                advisory.risk_level.toLowerCase() === 'high' ? 'CẢNH BÁO NGUY HIỂM' :
                                advisory.risk_level.toLowerCase() === 'medium' ? 'CẦN CHÚ Ý' : 'AN TOÀN / BÌNH THƯỜNG'
                            ) : 'THÔNG TIN',
                            title: 'Khuyến Nghị Thời Tiết Hiện Tại (Live Advisory)',
                            reason: advisory?.advice_text ?? 'Không có khuyến nghị thời tiết.',
                            icon: 'fa-bell',
                            color: 'border-orange-200 dark:border-orange-500/45 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400',
                        },
                        {
                            level: anomalyCount > 0 ? 'CẢNH BÁO BẤT THƯỜNG' : 'BÌNH THƯỜNG',
                            title: 'Trạng Thái Phát Hiện Dị Biệt AI (Anomaly Status)',
                            reason: anomalyCount > 0
                                ? `Phát hiện ${anomalyCount} ngày thời tiết bất thường trong khoảng từ ${startDate} đến ${endDate} bằng mô hình Isolation Forest.`
                                : `Không phát hiện dị biệt thời tiết nào trong khoảng từ ${startDate} đến ${endDate}.`,
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
                            <p className="mt-1 text-[10px] leading-relaxed opacity-90 font-medium">Giải thích (xAI): {alert.reason}</p>
                        </article>
                    ))}
                </div>
            </section>

            {/* ROW 3: Charts & Maps */}
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                {/* Geospatial Map */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 xl:col-span-5 shadow-sm flex flex-col">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-black text-gray-900 dark:text-[#f3f4f6] uppercase tracking-wider">Bản Đồ Phân Bố Trạm Khí Tượng (Map)</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Hiển thị vị trí các thành phố và trạm đo khí tượng thực tế.</p>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">{scopeMode === 'vietnam' ? 'Khu vực Việt Nam' : 'Góc nhìn Toàn cầu'}</span>
                    </div>
                    <div className="relative flex-1 min-h-[420px] overflow-hidden rounded-xl border border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#151515] flex items-center justify-center">
                        <InteractiveMap isDark={isDark} data={mapData} isLoading={mapLoading} error={mapError} scopeMode={scopeMode} />
                    </div>
                </article>

                {/* Multi-variable Analytics Chart */}
                <article className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl p-5 xl:col-span-7 shadow-sm flex flex-col min-w-0">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-black text-gray-900 dark:text-[#f3f4f6] uppercase tracking-wider">Biểu Đồ Xu Hướng Nhiệt Độ & Lượng Mưa (Analytics Chart)</h3>
                            <p className="text-[10px] text-gray-400 mt-0.5">Biểu đồ tổng hợp quá khứ (Nhiệt thực tế, Lượng mưa, AQI) và tương lai (Đường nét đứt dự báo 7 ngày).</p>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">Lịch Sử & Dự Báo</span>
                    </div>

                    <div className="flex-1 min-h-[420px] w-full min-w-0">
                        {chartReady ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={trendData.length > 0 ? trendData : [{ time: '--', tempActual: 0, anomalyTemp: null, tempForecast: 0, rainfall: 0, aqi: null }]} margin={{ top: 5, right: -10, left: -25, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#2d3238" : "#e2e8f0"} vertical={false} />
                                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.ceil(trendData.length / 8) - 1)} />
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
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: isDark ? '#e5e7eb' : '#374151' }} />

                                <Area yAxisId="right" type="monotone" dataKey="rainfall" name="Lượng mưa (Rain - mm)" stroke="#0ea5e9" fill="url(#rainFill)" strokeWidth={2} />
                                
                                {/* Đường Nhiệt độ Thực tế (Quá khứ) */}
                                <Line yAxisId="left" type="monotone" dataKey="tempActual" name="Nhiệt độ thực tế (°C)" stroke="#f97316" strokeWidth={3} dot={{ r: 3, fill: '#f97316' }} connectNulls />
                                
                                {/* Đường Dự báo (Tương lai) - Nét đứt */}
                                <Line yAxisId="left" type="monotone" dataKey="tempForecast" name="Nhiệt độ dự báo 7 ngày (°C)" stroke="#fdba74" strokeDasharray="5 5" strokeWidth={3} dot={false} connectNulls />
                                
                                {/* Điểm cảnh báo Anomaly (Chấm đỏ lồi lên) */}
                                <Line yAxisId="left" type="monotone" dataKey="anomalyTemp" name="Cảnh báo bất thường từ AI" stroke="#ef4444" strokeWidth={0} isAnimationActive={false} dot={{ r: 6, fill: '#ef4444', stroke: isDark ? '#1e1e1e' : '#ffffff', strokeWidth: 2 }} activeDot={{ r: 8 }} />
                                
                                {/* Missing AQI remains null; connectNulls=false to show signal break explicitly. */}
                                <Line yAxisId="right" type="monotone" dataKey="aqi" name="Chất lượng không khí (AQI)" stroke="#a855f7" strokeWidth={2} dot={{ r: 2, fill: '#a855f7' }} connectNulls={false} />
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