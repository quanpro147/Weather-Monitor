import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import MapLegend from './MapLegend';

export type LayerId = 'aqi' | 'temp' | 'rain';
type ScopeMode = 'vietnam' | 'global';

export interface MapDataPoint {
    id: number;
    city: string;
    lat: number;
    lng: number;
    temp: number | null;
    aqi: number | null;
    rain: number | null;
}

export interface MapViewportBounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    zoom: number;
}

interface InteractiveMapProps {
    isDark?: boolean;
    data: MapDataPoint[];
    isLoading?: boolean;
    error?: string | null;
    activeLayer?: LayerId;
    scopeMode?: ScopeMode;
    onViewportChange?: (bounds: MapViewportBounds) => void;
}

// Logic phối màu động cho từng Layer
const getPointColor = (point: MapDataPoint, layer: LayerId) => {
    if (layer === 'aqi') {
        const val = point.aqi;
        if (val === null || val === undefined) return '#64748b';
        if (val <= 50) return '#10b981';
        if (val <= 100) return '#fbbf24';
        if (val <= 150) return '#f97316';
        if (val <= 200) return '#ef4444';
        return '#a855f7';
    }
    if (layer === 'temp') {
        const val = point.temp;
        if (val === null || val === undefined) return '#64748b';
        if (val < 24) return '#3b82f6';
        if (val <= 28) return '#10b981';
        if (val <= 33) return '#fbbf24';
        if (val <= 37) return '#f97316';
        return '#ef4444';
    }
    if (layer === 'rain') {
        const val = point.rain;
        if (val === null || val === undefined) return '#64748b';
        if (val === 0) return '#9ca3af'; // Màu xám nhạt nếu ko mưa
        if (val <= 5) return '#7dd3fc';
        if (val <= 15) return '#38bdf8';
        if (val <= 50) return '#0284c7';
        return '#1e3a8a';
    }
    return '#64748b';
};

function formatMetric(value: number | null | undefined, suffix: string): string {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
    return `${value}${suffix}`;
}

// Hàm tạo Icon động
function createStationIcon(point: MapDataPoint, activeLayer: LayerId, isDark: boolean): L.DivIcon {
    const fillColor = getPointColor(point, activeLayer);
    const borderColor = isDark ? '#1e1e1e' : '#ffffff';
    
    return L.divIcon({
        className: 'station-marker-icon',
        html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${fillColor};border:2px solid ${borderColor};box-shadow:0 0 4px rgba(0,0,0,0.3);"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
}

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const timeout = setTimeout(() => { map.invalidateSize(); }, 200);
        return () => clearTimeout(timeout);
    }, [map]);
    return null;
}

function ViewportObserver({ onViewportChange }: { onViewportChange?: (bounds: MapViewportBounds) => void }) {
    const lastKeyRef = useRef<string>('');

    const publishBounds = (map: L.Map) => {
        if (!onViewportChange) {
            return;
        }

        const bounds = map.getBounds();
        const payload: MapViewportBounds = {
            minLat: bounds.getSouth(),
            maxLat: bounds.getNorth(),
            minLng: bounds.getWest(),
            maxLng: bounds.getEast(),
            zoom: map.getZoom(),
        };

        const nextKey = `${payload.minLat.toFixed(3)}:${payload.maxLat.toFixed(3)}:${payload.minLng.toFixed(3)}:${payload.maxLng.toFixed(3)}:${payload.zoom}`;
        if (nextKey === lastKeyRef.current) {
            return;
        }

        lastKeyRef.current = nextKey;
        onViewportChange(payload);
    };

    const map = useMapEvents({
        moveend() {
            publishBounds(map);
        },
        zoomend() {
            publishBounds(map);
        },
    });

    useEffect(() => {
        publishBounds(map);
    }, [map]);

    return null;
}

export default function InteractiveMap({ isDark = true, data, isLoading = false, error = null, activeLayer = 'aqi', scopeMode = 'vietnam', onViewportChange }: InteractiveMapProps) {
    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const mapCenter: [number, number] = scopeMode === 'global' ? [20, 0] : [16.4, 106.5];
    const mapZoom = scopeMode === 'global' ? 2.25 : 5.2;
    const mapKey = `${scopeMode}-${isDark ? 'dark' : 'light'}`;
    const showBlockingLoading = isLoading && data.length === 0;
    const showInlineLoading = isLoading && data.length > 0;

    return (
        <div className="relative w-full h-full z-10 overflow-hidden bg-gray-100 dark:bg-[#151515]">
            <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                className="w-full h-full"
                zoomControl={false}
            >
                <MapResizer />
                <ViewportObserver onViewportChange={onViewportChange} />
                <TileLayer key={tileUrl} url={tileUrl} attribution='&copy; CARTO' />

                <MarkerClusterGroup chunkedLoading maxClusterRadius={42} showCoverageOnHover={false}>
                    {data.map((point) => (
                        <Marker key={point.id} position={[point.lat, point.lng]} icon={createStationIcon(point, activeLayer, isDark)}>
                            <Popup className={isDark ? 'custom-popup-dark' : 'custom-popup-light'}>
                                <div className="p-1 min-w-[160px]">
                                    <p className={`font-black text-sm uppercase mb-2 border-b pb-1 ${isDark ? 'border-[#2a2d33] text-white' : 'border-gray-200 text-gray-900'}`}>
                                        {point.city}
                                    </p>
                                    <div className="flex flex-col gap-1.5 text-[11px] whitespace-nowrap">
                                        <div className="flex justify-between items-center gap-3">
                                            <span className="font-bold text-orange-500">Temp:</span>
                                            <span className={`font-black ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatMetric(point.temp, '°C')}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-3">
                                            <span className={`font-bold ${point.aqi === null || point.aqi === undefined ? 'text-slate-500' : point.aqi > 100 ? 'text-red-500' : 'text-emerald-500'}`}>AQI:</span>
                                            <span className={`font-black ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{point.aqi ?? 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-3">
                                            <span className="font-bold text-blue-500">Rain:</span>
                                            <span className={`font-black ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{formatMetric(point.rain, ' mm')}</span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MarkerClusterGroup>
            </MapContainer>

            {showBlockingLoading && <div className="absolute inset-0 z-[500] grid place-items-center bg-black/30 text-xs font-bold uppercase text-white">Loading data...</div>}
            {showInlineLoading && (
                <div className="absolute top-3 left-3 z-[500] rounded-md bg-black/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Updating viewport...
                </div>
            )}
            
            {/* Truyền activeLayer xuống MapLegend để đổi Legend tương ứng */}
            <MapLegend isDark={isDark} activeLayer={activeLayer} />
        </div>
    );
}