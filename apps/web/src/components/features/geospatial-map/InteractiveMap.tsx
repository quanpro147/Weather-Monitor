import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MapLegend from './MapLegend';

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

function formatMetric(value: number | null | undefined, suffix: string): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return 'N/A';
    }
    return `${value}${suffix}`;
}

// Component điều chỉnh lại kích thước bản đồ khi container cha thay đổi
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const timeout = setTimeout(() => { map.invalidateSize(); }, 200);
        return () => clearTimeout(timeout);
    }, [map]);
    return null;
}

export default function InteractiveMap({ isDark = true, data, isLoading = false, error = null }: InteractiveMapProps) {
    // Định tuyến Map Tiles (Sáng/Tối)
    const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'; 

    return (
        <div className="relative w-full h-full z-10 rounded-xl overflow-hidden border border-gray-200 dark:border-[#2a2a2a] bg-gray-100 dark:bg-[#151515]">
            <MapContainer 
                center={[16.4, 106.5]} // Căn giữa lại bản đồ để nhìn bao quát toàn bộ VN (từ Hà Nội đến Cà Mau)
                zoom={5.2} 
                scrollWheelZoom={true}
                className="w-full h-full"
                zoomControl={false}
            >
                <MapResizer />
                
                <TileLayer
                    url={tileUrl}
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {data.map((point) => (
                    <CircleMarker
                        key={point.id}
                        center={[point.lat, point.lng]}
                        radius={point.aqi === null || point.aqi === undefined ? 8 : 10}
                        pathOptions={{ 
                            fillColor: getAqiColor(point.aqi), 
                            color: '#f8fafc',
                            weight: 2,
                            fillOpacity: point.aqi === null || point.aqi === undefined ? 0.65 : 0.9,
                        }}
                        eventHandlers={{
                            mouseover: (e) => {
                                e.target.openPopup();
                            },
                            mouseout: (e) => {
                                e.target.closePopup();
                            },
                        }}
                    >
                        <Popup className={isDark ? 'custom-popup-dark' : 'custom-popup-light'}>
                            <div className="p-1 min-w-[120px]">
                                <p className="font-black text-sm uppercase mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 text-gray-900 dark:text-white">
                                    {point.city}
                                </p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                                    <div className="font-bold text-orange-500">
                                        Temp: <span className="font-black text-gray-800 dark:text-gray-200">{formatMetric(point.temp, '°C')}</span>
                                    </div>
                                    <div className={`font-bold ${point.aqi === null || point.aqi === undefined ? 'text-slate-500' : point.aqi > 100 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        AQI: <span className="font-black text-gray-800 dark:text-gray-200">{point.aqi ?? 'N/A'}</span>
                                    </div>
                                    <div className="font-bold text-blue-500 col-span-2">
                                        Rain: <span className="font-black text-gray-800 dark:text-gray-200">{formatMetric(point.rain, ' mm')}</span>
                                    </div>
                                    {(point.aqi === null || point.aqi === undefined) && (
                                        <div className="col-span-2 text-[10px] font-semibold text-slate-500">
                                            Sensor Offline / Du lieu khong kha dung
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
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

            <MapLegend isDark={isDark} />
        </div>
    );
}