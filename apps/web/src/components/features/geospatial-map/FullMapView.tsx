import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { useTheme } from '../../../contexts/ThemeContext';
import { listCities } from '../../../services/city.service';
import { getCurrentWeatherBulk } from '../../../services/weather.service';
import type { WeatherDaily } from '../../../types/weather';
import type { City } from '../../../types/city';
import type { MapDataPoint, MapViewportBounds } from './InteractiveMap';

type LayerId = 'aqi' | 'temp' | 'rain';
type MapLoadMode = 'viewport' | 'overview';

type WeatherWithRealtime = WeatherDaily & {
    aqi?: number | null;
    air_quality_index?: number | null;
    temperature?: number | null;
    precipitation?: number | null;
};

interface QuickInsightsState {
    scopeLabel: string;
    worstAqiCity: string;
    worstAqiValue: number;
    riskLevel: string;
    offlineCount: number;
}

// Dynamic import tái sử dụng lại InteractiveMap đã làm
const InteractiveMap = dynamic(
    () => import('./InteractiveMap'),
    { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-gray-100 dark:bg-[#151515] rounded-xl" /> }
);

export default function FullMapView() {
    const { isDark } = useTheme();
    const [activeLayer, setActiveLayer] = useState<LayerId>('rain'); // Theo yêu cầu Rainfall Radar khởi tạo
    const { cityId, scopeMode } = useGlobalFilter();

    const getRiskLevel = (aqi: number) => {
        if (aqi <= 50) return 'Good (0-50)';
        if (aqi <= 100) return 'Moderate (51-100)';
        if (aqi <= 150) return 'Sensitive (101-150)';
        if (aqi <= 200) return 'Unhealthy (151-200)';
        return 'Hazardous (201+)';
    };

    const buildThemePreset = (dark: boolean, scopeLabel: string): QuickInsightsState => {
        if (dark) {
            return {
                scopeLabel,
                worstAqiCity: 'Ha Noi',
                worstAqiValue: 185,
                riskLevel: 'Unhealthy (151-200)',
                offlineCount: 3,
            };
        }

        return {
            scopeLabel,
            worstAqiCity: 'Da Nang',
            worstAqiValue: 85,
            riskLevel: 'Moderate (51-100)',
            offlineCount: 0,
        };
    };

    const [cities, setCities] = useState<City[]>([]);
    const [mapData, setMapData] = useState<MapDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mapViewport, setMapViewport] = useState<MapViewportBounds | null>(null);
    const [loadMode, setLoadMode] = useState<MapLoadMode>('overview');
    const [visibleStationCount, setVisibleStationCount] = useState(0);
    const fetchSeqRef = useRef(0);
    const [quickInsights, setQuickInsights] = useState<QuickInsightsState>(
        buildThemePreset(true, 'Ben Tre')
    );

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const normalizeViewport = (viewport: MapViewportBounds): MapViewportBounds => ({
        ...viewport,
        minLat: clamp(viewport.minLat, -90, 90),
        maxLat: clamp(viewport.maxLat, -90, 90),
        minLng: clamp(viewport.minLng, -180, 180),
        maxLng: clamp(viewport.maxLng, -180, 180),
    });

    const getScopeLabel = (cityList: City[], selectedCityId: number | null) => {
        const selected = selectedCityId === null ? null : cityList.find((city) => city.city_id === selectedCityId);
        if (selected) {
            return selected.city;
        }

        return isDark ? 'Ben Tre' : 'Binh Dinh';
    };

    const fetchMapData = async () => {
        const requiresViewport = scopeMode === 'global' && loadMode === 'viewport';
        if (requiresViewport && !mapViewport) {
            return;
        }

        const requestId = ++fetchSeqRef.current;
        setIsLoading(true);
        setError(null);

        try {
            let cityList: City[];

            if (scopeMode === 'vietnam') {
                const vnByCanonical = await listCities({ country: 'Viet Nam' });
                cityList = vnByCanonical.length > 0 ? vnByCanonical : await listCities({ country: 'Vietnam' });
            } else if (requiresViewport && mapViewport) {
                const viewport = normalizeViewport(mapViewport);
                if (viewport.minLng <= viewport.maxLng) {
                    cityList = await listCities({
                        min_lat: viewport.minLat,
                        max_lat: viewport.maxLat,
                        min_lng: viewport.minLng,
                        max_lng: viewport.maxLng,
                        limit: VIEWPORT_CITY_LIMIT,
                    });
                } else {
                    const [westWrap, eastWrap] = await Promise.all([
                        listCities({
                            min_lat: viewport.minLat,
                            max_lat: viewport.maxLat,
                            min_lng: viewport.minLng,
                            max_lng: 180,
                            limit: VIEWPORT_CITY_LIMIT,
                        }),
                        listCities({
                            min_lat: viewport.minLat,
                            max_lat: viewport.maxLat,
                            min_lng: -180,
                            max_lng: viewport.maxLng,
                            limit: VIEWPORT_CITY_LIMIT,
                        }),
                    ]);
                    cityList = Array.from(new Map([...westWrap, ...eastWrap].map((item) => [item.city_id, item])).values());
                }
            } else {
                // Global overview: snapshot for broad coverage while keeping render smooth.
                cityList = await listCities({ limit: OVERVIEW_CITY_LIMIT });
            }

            if (requestId !== fetchSeqRef.current) {
                return;
            }

            setCities(cityList);
            setVisibleStationCount(cityList.length);

            const scopeLabel = getScopeLabel(cityList, cityId);
            const weatherRows = await getCurrentWeatherBulk(cityList.map((city) => city.city_id));
            if (requestId !== fetchSeqRef.current) {
                return;
            }
            const weatherByCityId = new Map<number, WeatherWithRealtime>(
                weatherRows.map((row) => [row.city_id, row as WeatherWithRealtime])
            );

            const nextMapData: MapDataPoint[] = [];
            let worstAqiValue = -1;
            let worstAqiCity = '--';
            let offlineCount = 0;

            cityList.forEach((city) => {
                const weather = weatherByCityId.get(city.city_id);
                if (!weather) {
                    return;
                }

                const aqi = weather.air_quality_index ?? weather.aqi ?? null;
                const temp = weather.temperature ?? weather.temperature_2m_mean ?? weather.temperature_2m_max ?? null;
                const rain = weather.precipitation ?? weather.rain_sum ?? null;

                nextMapData.push({
                    id: city.city_id,
                    city: city.city,
                    lat: city.latitude,
                    lng: city.longitude,
                    temp,
                    aqi,
                    rain,
                });

                if (aqi === null) {
                    offlineCount += 1;
                    return;
                }

                if (aqi > worstAqiValue) {
                    worstAqiValue = aqi;
                    worstAqiCity = city.city;
                }
            });

            setMapData(nextMapData);

            if (nextMapData.length === 0) {
                setError('No stations available for map rendering.');
                setQuickInsights(buildThemePreset(isDark, scopeLabel));
                return;
            }

            if (worstAqiValue < 0) {
                setQuickInsights({
                    scopeLabel,
                    worstAqiCity: '--',
                    worstAqiValue: 0,
                    riskLevel: 'Offline / N/A',
                    offlineCount,
                });
                return;
            }

            setQuickInsights({
                scopeLabel,
                worstAqiCity,
                worstAqiValue,
                riskLevel: getRiskLevel(worstAqiValue),
                offlineCount,
            });
        } catch (nextError) {
            if (requestId !== fetchSeqRef.current) {
                return;
            }
            setMapData([]);
            setError(nextError instanceof Error ? nextError.message : 'Failed to load geospatial data');
            setQuickInsights(buildThemePreset(isDark, isDark ? 'Ben Tre' : 'Binh Dinh'));
        } finally {
            if (requestId === fetchSeqRef.current) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            void fetchMapData();
        }, FETCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [cityId, scopeMode, loadMode, mapViewport]);

    useEffect(() => {
        if (scopeMode === 'global') {
            setLoadMode('viewport');
            return;
        }
        setLoadMode('overview');
    }, [scopeMode]);

    useEffect(() => {
        if (mapData.length === 0 && !isLoading) {
            const scopeLabel = getScopeLabel(cities, cityId);
            setQuickInsights(buildThemePreset(isDark, scopeLabel));
        }
    }, [isDark]);

    return (
        <div className="relative w-full h-[calc(100vh-120px)] flex flex-col gap-4 animate-in fade-in duration-700">
            
            {/* Header của trang Map */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-[#f3f4f6] tracking-tight">Geospatial Analytics</h2>
                    <p className="text-xs text-gray-500 dark:text-[#9ca3af] font-medium mt-1">Full-screen spatial reasoning and layer control</p>
                </div>
                {/* Nút giả lập fetch -> Update Data */}
                <button 
                    onClick={() => void fetchMapData()}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2 ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a]' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'} border`}
                >
                    <i className={`fa-solid fa-rotate-right ${isLoading ? 'fa-spin' : ''}`}></i>
                    Refresh Grid Data
                </button>
            </div>

            {/* Container chứa Bản đồ (Zero Margin Layout được fix bên map.tsx và cấu trúc padding ở đây) */}
            <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                
                {/* Lớp Bản đồ ở dưới cùng (z-0) */}
                <div className="absolute inset-0 z-0">
                    <InteractiveMap
                        data={mapData}
                        isLoading={isLoading}
                        error={error}
                        activeLayer={activeLayer}
                        scopeMode={scopeMode}
                        onViewportChange={(nextViewport) => {
                            if (scopeMode !== 'global') {
                                return;
                            }
                            setMapViewport(nextViewport);
                        }}
                    /> 
                </div>

                {/* --- FLOATING PANELS (Đè lên trên bản đồ) --- */}

                {/* 1. Panel Panel Thống kê nhanh (Góc trái) */}
                <div className={`absolute top-5 left-5 z-[400] w-64 rounded-xl p-4 border backdrop-blur-md transition-colors ${
                    isDark ? 'bg-[#101010]/80 border-gray-800 shadow-xl' : 'bg-white/80 border-gray-200 shadow-lg'
                }`}>
                    <h3 className={`text-[10px] font-bold uppercase tracking-widest border-b pb-2 mb-3 flex items-center justify-between ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>
                        Quick Insights
                        {isLoading && <i className="fa-solid fa-circle-notch fa-spin text-cyan-500"></i>}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Monitoring Scope</p>
                            <p className={`text-sm font-black mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {scopeMode === 'global' ? 'Global View' : 'Viet Nam Provinces'}
                            </p>
                            <p className="text-[10px] mt-1 text-cyan-500 font-semibold">
                                {scopeMode === 'global'
                                    ? (loadMode === 'viewport' ? 'Viewport mode: pan/zoom to refresh local region' : 'Overview mode: fast global sample')
                                    : 'National Full Grid'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                {scopeMode === 'global' ? 'Global Worst AQI' : 'National Worst AQI'}
                            </p>
                            <p className={`text-sm font-black flex items-center gap-2 mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {quickInsights.worstAqiCity} 
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${quickInsights.worstAqiValue > 150 ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                    {quickInsights.worstAqiValue}
                                </span>
                            </p>
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">Risk: {quickInsights.riskLevel}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Offline Stations</p>
                            <p className={`text-sm font-black mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {quickInsights.offlineCount} <span className="text-[10px] font-normal text-gray-500 ml-1">(Check connectivity)</span>
                            </p>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Loaded Stations</p>
                            <p className={`text-sm font-black mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {visibleStationCount}
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Layer Controls (Góc phải trên) */}
                <div className={`absolute top-5 right-5 z-[400] rounded-xl p-1.5 shadow-xl border backdrop-blur-md flex flex-col gap-1 transition-colors ${
                    isDark ? 'bg-[#101010]/85 border-[#2a2a2a]' : 'bg-white/85 border-gray-200'
                }`}>
                    {scopeMode === 'global' && (
                        <>
                            <button
                                onClick={() => setLoadMode('viewport')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                    loadMode === 'viewport'
                                        ? 'bg-cyan-500 text-white shadow-md'
                                        : `hover:bg-gray-200/50 dark:hover:bg-[#2a2a2a]/50 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`
                                }`}
                            >
                                <i className="fa-solid fa-crop-simple w-4 text-center"></i>
                                Viewport Focus
                            </button>
                            <button
                                onClick={() => setLoadMode('overview')}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                    loadMode === 'overview'
                                        ? 'bg-cyan-500 text-white shadow-md'
                                        : `hover:bg-gray-200/50 dark:hover:bg-[#2a2a2a]/50 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`
                                }`}
                            >
                                <i className="fa-solid fa-earth-asia w-4 text-center"></i>
                                Global Overview
                            </button>
                        </>
                    )}
                    {[
                        { id: 'aqi', icon: 'fa-smog', label: 'AQI Heatmap' },
                        { id: 'temp', icon: 'fa-temperature-half', label: 'Temperature' },
                        { id: 'rain', icon: 'fa-cloud-rain', label: 'Rainfall Radar' }
                    ].map((layer) => (
                        <button
                            key={layer.id}
                            onClick={() => setActiveLayer(layer.id as LayerId)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                activeLayer === layer.id 
                                ? 'bg-cyan-500 text-white shadow-md' 
                                : `hover:bg-gray-200/50 dark:hover:bg-[#2a2a2a]/50 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'}`
                            }`}
                        >
                            <i className={`fa-solid ${layer.icon} w-4 text-center`}></i>
                            {layer.label}
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
}

const OVERVIEW_CITY_LIMIT = 220;
const VIEWPORT_CITY_LIMIT = 160;
const FETCH_DEBOUNCE_MS = 220;