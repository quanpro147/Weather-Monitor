import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';

// Dynamic import tái sử dụng lại InteractiveMap đã làm
const InteractiveMap = dynamic(
    () => import('./InteractiveMap'),
    { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-gray-100 dark:bg-[#151515] rounded-xl" /> }
);

export default function FullMapView({ isDark = true }: { isDark?: boolean }) {
    const [activeLayer, setActiveLayer] = useState('rain'); // Theo yêu cầu Rainfall Radar khởi tạo
    const { cityId } = useGlobalFilter();
    
    // UI Loading state
    const [isSimulating, setIsSimulating] = useState(false);

    // Mock data state dựa vào việc thay đổi scope (cityId)
    const [simulatedData, setSimulatedData] = useState({
        worstAqiCity: 'Ha Noi',
        worstAqiValue: 185,
        riskLevel: 'Unhealthy (151-200)',
        offlineCount: 3
    });

    // Hàm giả lập API call với setTimeout
    const fetchWeatherInsights = (scope: number | null) => {
        setIsSimulating(true);
        setTimeout(() => {
            if (scope === 1) { // Ví dụ scope 1 là Hà Nội
                setSimulatedData({
                    worstAqiCity: 'Ha Noi',
                    worstAqiValue: 185,
                    riskLevel: 'Unhealthy (151-200)',
                    offlineCount: 3
                });
            } else if (scope === 2) { // Ví dụ scope 2 là HCM
                setSimulatedData({
                    worstAqiCity: 'Ho Chi Minh City',
                    worstAqiValue: 142,
                    riskLevel: 'Sensitive (101-150)',
                    offlineCount: 1
                });
            } else {
                setSimulatedData({
                    worstAqiCity: 'Da Nang',
                    worstAqiValue: 85,
                    riskLevel: 'Moderate (51-100)',
                    offlineCount: 0
                });
            }
            setIsSimulating(false);
        }, 800);
    };

    // Theo dõi thay đổi scope từ Global Context (được cập nhật trên Topbar)
    useEffect(() => {
        fetchWeatherInsights(cityId);
    }, [cityId]);

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
                    onClick={() => fetchWeatherInsights(cityId)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm flex items-center gap-2 ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-gray-300 hover:bg-[#2a2a2a]' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'} border`}
                >
                    <i className={`fa-solid fa-rotate-right ${isSimulating ? 'fa-spin' : ''}`}></i>
                    Refresh Grid Data
                </button>
            </div>

            {/* Container chứa Bản đồ (Zero Margin Layout được fix bên map.tsx và cấu trúc padding ở đây) */}
            <div className="relative flex-1 w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-[#2a2a2a] shadow-sm">
                
                {/* Lớp Bản đồ ở dưới cùng (z-0) */}
                <div className="absolute inset-0 z-0">
                    <InteractiveMap isDark={isDark} data={[]} activeLayer={activeLayer} /> 
                </div>

                {/* --- FLOATING PANELS (Đè lên trên bản đồ) --- */}

                {/* 1. Panel Panel Thống kê nhanh (Góc trái) */}
                <div className={`absolute top-5 left-5 z-[400] w-64 rounded-xl p-4 shadow-xl border backdrop-blur-md transition-colors ${
                    isDark ? 'bg-[#101010]/85 border-[#2a2a2a]' : 'bg-white/85 border-gray-200'
                }`}>
                    <h3 className={`text-[10px] font-bold uppercase tracking-widest border-b pb-2 mb-3 flex items-center justify-between ${isDark ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>
                        Quick Insights
                        {isSimulating && <i className="fa-solid fa-circle-notch fa-spin text-cyan-500"></i>}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Worst AQI Station</p>
                            <p className={`text-sm font-black flex items-center gap-2 mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {simulatedData.worstAqiCity} 
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${simulatedData.worstAqiValue > 150 ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                    {simulatedData.worstAqiValue}
                                </span>
                            </p>
                            <p className="text-[10px] text-red-500 font-semibold mt-0.5">Risk: {simulatedData.riskLevel}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Offline Stations</p>
                            <p className={`text-sm font-black mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {simulatedData.offlineCount} <span className="text-[10px] font-normal text-gray-500 ml-1">(Check connectivity)</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Layer Controls (Góc phải trên) */}
                <div className={`absolute top-5 right-5 z-[400] rounded-xl p-1.5 shadow-xl border backdrop-blur-md flex flex-col gap-1 transition-colors ${
                    isDark ? 'bg-[#101010]/85 border-[#2a2a2a]' : 'bg-white/85 border-gray-200'
                }`}>
                    {[
                        { id: 'aqi', icon: 'fa-smog', label: 'AQI Heatmap' },
                        { id: 'temp', icon: 'fa-temperature-half', label: 'Temperature' },
                        { id: 'rain', icon: 'fa-cloud-rain', label: 'Rainfall Radar' }
                    ].map((layer) => (
                        <button
                            key={layer.id}
                            onClick={() => setActiveLayer(layer.id)}
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