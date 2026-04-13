import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MapLegend from './MapLegend';

// Khai báo Props ở đây
interface MapProps {
    isDark?: boolean;
}

interface MapDataPoint {
    id: number;
    city: string;
    lat: number;
    lng: number;
    temp: number;
    aqi: number;
    rain: number;
}

// Hàm xác định màu dựa trên AQI
const getAqiColor = (aqi: number) => {
    if (aqi <= 50) return '#10b981'; // Green
    if (aqi <= 100) return '#fbbf24'; // Yellow
    if (aqi <= 150) return '#f97316'; // Orange
    if (aqi <= 200) return '#ef4444'; // Red
    return '#a855f7'; // Purple
};

// Component điều chỉnh lại kích thước bản đồ khi container cha thay đổi
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => { map.invalidateSize(); }, 200);
    }, [map]);
    return null;
}

export default function InteractiveMap({ isDark = true }: { isDark?: boolean }) {
    // MOCK DATA: Tọa độ một số thành phố tại VN (Bạn sẽ thay bằng data fetch từ API)
    const mapData: MapDataPoint[] = [
        { id: 1, city: 'Ho Chi Minh City', lat: 10.8231, lng: 106.6297, temp: 34, aqi: 142, rain: 12 },
        { id: 2, city: 'Ha Noi', lat: 21.0285, lng: 105.8542, temp: 28, aqi: 185, rain: 0 },
        { id: 3, city: 'Da Nang', lat: 16.0471, lng: 108.2062, temp: 31, aqi: 45, rain: 5 },
        { id: 4, city: 'Can Tho', lat: 10.0452, lng: 105.7469, temp: 33, aqi: 65, rain: 18 },
    ];

    // Định tuyến Map Tiles (Sáng/Tối)
    const tileUrl = isDark 
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' // Carto Dark
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'; // Carto Light

    return (
        <div className="relative w-full h-full z-10 rounded-xl overflow-hidden border border-gray-200 dark:border-[#2a2a2a]">
            <MapContainer 
                center={[16.0471, 106.0]} // Tọa độ trung tâm VN
                zoom={5.5} 
                scrollWheelZoom={true}
                className="w-full h-full"
                zoomControl={false} // Tắt nút zoom mặc định cho UI gọn gàng
            >
                <MapResizer />
                
                <TileLayer
                    url={tileUrl}
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {mapData.map((point) => (
                    <CircleMarker
                        key={point.id}
                        center={[point.lat, point.lng]}
                        radius={14} // Kích thước đủ lớn để Touch-Optimized
                        pathOptions={{ 
                            fillColor: getAqiColor(point.aqi), 
                            color: isDark ? '#1e1e1e' : '#ffffff', 
                            weight: 2, 
                            fillOpacity: 0.8 
                        }}
                    >
                        {/* Popup Modal (Progressive Disclosure) */}
                        <Popup className={isDark ? 'custom-popup-dark' : 'custom-popup-light'}>
                            <div className="p-1">
                                <p className="font-black text-sm uppercase mb-2 border-b pb-1">{point.city}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                    <div className="font-bold text-orange-500">Temp: <span className="font-black">{point.temp}°C</span></div>
                                    <div className="font-bold text-red-500">AQI: <span className="font-black">{point.aqi}</span></div>
                                    <div className="font-bold text-blue-500">Rain: <span className="font-black">{point.rain} mm</span></div>
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}
            </MapContainer>

            <MapLegend isDark={isDark} />
        </div>
    );
}