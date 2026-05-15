import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import MapLegend from './MapLegend';
import { useTheme } from '../../../contexts/ThemeContext';

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
    data: MapDataPoint[];
    isLoading?: boolean;
    error?: string | null;
    activeLayer?: LayerId;
    scopeMode?: ScopeMode;
    onViewportChange?: (bounds: MapViewportBounds) => void;
}

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
        if (val === 0) return '#9ca3af';
        if (val <= 5) return '#7dd3fc';
        if (val <= 15) return '#38bdf8';
        if (val <= 50) return '#0284c7';
        return '#1e3a8a';
    }
    return '#64748b';
};

function getLabelText(point: MapDataPoint, layer: LayerId): string | null {
    if (layer === 'temp') {
        if (point.temp === null || point.temp === undefined) return null;
        return `${point.temp}°C`;
    }
    if (layer === 'aqi') {
        if (point.aqi === null || point.aqi === undefined) return null;
        return `${point.aqi}`;
    }
    if (layer === 'rain') {
        if (point.rain === null || point.rain === undefined) return null;
        return `${point.rain}mm`;
    }
    return null;
}

function formatMetric(value: number | null | undefined, suffix: string): string {
    if (value === null || value === undefined || Number.isNaN(value)) return 'N/A';
    return `${value}${suffix}`;
}

function createStationIcon(point: MapDataPoint, activeLayer: LayerId, isDark: boolean, showLabel: boolean): L.DivIcon {
    const fillColor = getPointColor(point, activeLayer);
    const borderColor = isDark ? '#1e1e1e' : '#ffffff';

    const dotHtml = `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${fillColor};border:2px solid ${borderColor};box-shadow:0 0 4px rgba(0,0,0,0.3);"></span>`;

    const labelText = showLabel ? getLabelText(point, activeLayer) : null;
    const labelHtml = labelText
        ? `<span style="position:absolute;top:18px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:9px;font-weight:700;color:#fff;text-shadow:0 0 3px rgba(0,0,0,0.9),0 0 6px rgba(0,0,0,0.6);pointer-events:none;">${labelText}</span>`
        : '';

    return L.divIcon({
        className: 'station-marker-icon',
        html: labelText
            ? `<div style="position:relative;display:inline-block;">${dotHtml}${labelHtml}</div>`
            : dotHtml,
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
        if (!onViewportChange) return;

        const bounds = map.getBounds();
        const payload: MapViewportBounds = {
            minLat: bounds.getSouth(),
            maxLat: bounds.getNorth(),
            minLng: bounds.getWest(),
            maxLng: bounds.getEast(),
            zoom: map.getZoom(),
        };

        const nextKey = `${payload.minLat.toFixed(3)}:${payload.maxLat.toFixed(3)}:${payload.minLng.toFixed(3)}:${payload.maxLng.toFixed(3)}:${payload.zoom}`;
        if (nextKey === lastKeyRef.current) return;

        lastKeyRef.current = nextKey;
        onViewportChange(payload);
    };

    const map = useMapEvents({
        moveend() { publishBounds(map); },
        zoomend() { publishBounds(map); },
    });

    useEffect(() => { publishBounds(map); }, [map]);
    return null;
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
    const map = useMapEvents({
        zoomend() { onZoom(map.getZoom()); },
    });
    return null;
}

export default function InteractiveMap({ data, isLoading = false, error = null, activeLayer = 'aqi', scopeMode = 'vietnam', onViewportChange }: InteractiveMapProps) {
    const { isDark } = useTheme();

    const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

    const mapCenter: [number, number] = scopeMode === 'global' ? [20, 0] : [16.4, 106.5];
    const mapZoom = scopeMode === 'global' ? 2.25 : 5.2;
    const mapKey = `${scopeMode}-${isDark ? 'dark' : 'light'}`;

    const [currentZoom, setCurrentZoom] = useState(mapZoom);

    useEffect(() => {
        setCurrentZoom(mapZoom);
    }, [mapKey]);

    const labelZoomThreshold = scopeMode === 'vietnam' ? 7 : 5;
    const showLabel = currentZoom >= labelZoomThreshold;

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
                <ZoomTracker onZoom={setCurrentZoom} />

                <TileLayer key={tileUrl} url={tileUrl} attribution='&copy; CARTO' />

                <MarkerClusterGroup chunkedLoading maxClusterRadius={42} showCoverageOnHover={false}>
                    {data.map((point) => (
                        <Marker key={point.id} position={[point.lat, point.lng]} icon={createStationIcon(point, activeLayer, isDark, showLabel)}>
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
                                        {(point.aqi === null || point.aqi === undefined) && (
                                            <div className={`mt-1 whitespace-normal text-[9px] font-semibold text-center p-1.5 rounded border ${isDark ? 'text-slate-400 bg-slate-800/50 border-slate-700' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
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

            {showBlockingLoading && <div className="absolute inset-0 z-[500] grid place-items-center bg-black/30 text-xs font-bold uppercase tracking-widest text-white">Loading data...</div>}
            {showInlineLoading && (
                <div className="absolute top-3 left-3 z-[500] rounded-md bg-black/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    Updating viewport...
                </div>
            )}

            <MapLegend activeLayer={activeLayer} />
        </div>
    );
}
