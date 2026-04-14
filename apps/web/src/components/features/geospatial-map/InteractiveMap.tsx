import React, { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, Tooltip, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import MapLegend from './MapLegend';
import { useTheme } from '../../../contexts/ThemeContext';

export type LayerId = 'aqi' | 'temp' | 'rain';

export interface MapDataPoint {
    id: number;
    city: string;
    lat: number;
    lng: number;
    temp: number | null;
    aqi: number | null;
    rain: number | null;
}

interface InteractiveMapProps {
    isDark?: boolean;
    data: MapDataPoint[];
    isLoading?: boolean;
    error?: string | null;
    activeLayer?: LayerId;
}

// Missing data MUST use gray marker to avoid false-negative interpretation.
const getAqiColor = (aqi: number | null | undefined) => {
    if (aqi === null || aqi === undefined) return '#64748b'; // slate gray = no data/offline
    if (aqi <= 50) return '#10b981'; // Green
    if (aqi <= 100) return '#fbbf24'; // Yellow
    if (aqi <= 150) return '#f97316'; // Orange
    if (aqi <= 200) return '#ef4444'; // Red
    return '#a855f7'; // Purple
};

const AQI_REGIONS = [
    {
        name: 'Yunnan Corridor',
        aqi: 142,
        bounds: [
            [24.2, 102.1],
            [24.4, 104.6],
            [23.0, 105.2],
            [22.1, 103.0],
        ] as [number, number][],
        center: [23.5, 103.8] as [number, number],
    },
    {
        name: 'Guangxi Ridge',
        aqi: 108,
        bounds: [
            [24.1, 106.1],
            [23.7, 108.7],
            [22.3, 109.0],
            [21.7, 106.7],
        ] as [number, number][],
        center: [23.0, 107.6] as [number, number],
    },
    {
        name: 'Ha Giang Front',
        aqi: 86,
        bounds: [
            [23.4, 104.6],
            [23.6, 105.6],
            [22.8, 105.9],
            [22.4, 105.0],
        ] as [number, number][],
        center: [23.0, 105.3] as [number, number],
    },
    {
        name: 'Thai Nguyen Basin',
        aqi: 94,
        bounds: [
            [21.9, 105.3],
            [21.9, 106.1],
            [21.2, 106.2],
            [21.1, 105.4],
        ] as [number, number][],
        center: [21.5, 105.8] as [number, number],
    },
];

function formatMetric(value: number | null | undefined, suffix: string): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return 'N/A';
    }
    return `${value}${suffix}`;
}

function createStationIcon(aqi: number | null | undefined): L.DivIcon {
    const fillColor = getAqiColor(aqi);
    return L.divIcon({
        className: 'station-marker-icon',
        html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${fillColor};border:2px solid #f8fafc;box-shadow:0 0 0 2px rgba(15,23,42,0.2);"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
}

// Component điều chỉnh lại kích thước bản đồ khi container cha thay đổi
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const timeout = setTimeout(() => {
            map.invalidateSize();
        }, 200);
        return () => clearTimeout(timeout);
    }, [map]);
    return null;
}

export default function InteractiveMap({ isDark, data, isLoading = false, error = null, activeLayer = 'rain' }: InteractiveMapProps) {
    const { isDark: isGlobalDark } = useTheme();
    const resolvedDark = isDark ?? isGlobalDark;

    // Định tuyến Map Tiles (Sáng/Tối)
    const tileUrl = resolvedDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    return (
        <div className="relative w-full h-full z-10 overflow-hidden bg-gray-100 dark:bg-[#151515]">
            <MapContainer
                center={[16.4, 106.5]} // Căn giữa lại bản đồ để nhìn bao quát toàn bộ VN (từ Hà Nội đến Cà Mau)
                zoom={5.2}
                scrollWheelZoom={true}
                className="w-full h-full"
                zoomControl={false}
            >
                <MapResizer />

                <TileLayer
                    key={tileUrl}
                    url={tileUrl}
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {activeLayer === 'aqi' && (
                    <>
                        {AQI_REGIONS.map((region) => {
                            const regionColor = getAqiColor(region.aqi);
                            return (
                                <React.Fragment key={region.name}>
                                    <Polygon
                                        positions={region.bounds}
                                        pathOptions={{
                                            color: regionColor,
                                            weight: 1.2,
                                            fillColor: regionColor,
                                            fillOpacity: 0.22,
                                        }}
                                    >
                                        <Tooltip direction="center" permanent className="!bg-transparent !border-0 !shadow-none">
                                            <span className="text-[10px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                                {region.name} ({region.aqi})
                                            </span>
                                        </Tooltip>
                                    </Polygon>
                                    <Circle
                                        center={region.center}
                                        radius={70000}
                                        pathOptions={{
                                            color: regionColor,
                                            weight: 0,
                                            fillColor: regionColor,
                                            fillOpacity: 0.08,
                                        }}
                                    />
                                </React.Fragment>
                            );
                        })}
                    </>
                )}

                <MarkerClusterGroup chunkedLoading maxClusterRadius={42} showCoverageOnHover={false}>
                    {data.map((point) => (
                        <Marker key={point.id} position={[point.lat, point.lng]} icon={createStationIcon(point.aqi)}>
                            <Popup className={resolvedDark ? 'custom-popup-dark' : 'custom-popup-light'}>
                                <div className="p-1 min-w-[160px]">
                                    <p className={`font-black text-sm uppercase mb-2 border-b pb-1 ${resolvedDark ? 'border-[#2a2d33] text-white' : 'border-gray-200 text-gray-900'}`}>
                                        {point.city}
                                    </p>
                                    <div className="flex flex-col gap-1.5 text-[11px] whitespace-nowrap">
                                        <div className="flex justify-between items-center gap-3">
                                            <span className="font-bold text-orange-500">Temp:</span>
                                            <span className={`font-black ${resolvedDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatMetric(point.temp, '°C')}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-3">
                                            <span className={`font-bold ${point.aqi === null || point.aqi === undefined ? 'text-slate-500' : point.aqi > 100 ? 'text-red-500' : 'text-emerald-500'}`}>AQI:</span>
                                            <span className={`font-black ${resolvedDark ? 'text-gray-200' : 'text-gray-800'}`}>{point.aqi ?? 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-3">
                                            <span className="font-bold text-blue-500">Rain:</span>
                                            <span className={`font-black ${resolvedDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatMetric(point.rain, ' mm')}</span>
                                        </div>
                                        {(point.aqi === null || point.aqi === undefined) && (
                                            <div className={`mt-1 whitespace-normal text-[9px] font-semibold text-center p-1.5 rounded border ${resolvedDark ? 'text-slate-400 bg-slate-800/50 border-slate-700' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                                                Sensor Offline / No Data
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {isLoading && (
                <div className="absolute inset-0 z-[500] grid place-items-center bg-black/30 text-xs font-bold uppercase tracking-widest text-white">
                    Loading map data...
                </div>
            )}

            {!isLoading && !!error && (
                <div className="absolute left-4 top-4 z-[500] rounded-lg border border-red-300 bg-red-50/95 px-3 py-2 text-xs font-semibold text-red-700 shadow-md">
                    Map data error: {error}
                </div>
            )}

            {!isLoading && !error && data.length === 0 && (
                <div className="absolute left-4 top-4 z-[500] rounded-lg border border-slate-300 bg-slate-50/95 px-3 py-2 text-xs font-semibold text-slate-700 shadow-md">
                    No stations available for map rendering.
                </div>
            )}

            <MapLegend isDark={resolvedDark} />
        </div>
    );
}