import React from 'react';
import type { LayerId } from './InteractiveMap';
import { useTheme } from '../../../contexts/ThemeContext'; // Import Context

interface MapLegendProps {
    activeLayer?: LayerId;
}

export default function MapLegend({ activeLayer = 'aqi' }: MapLegendProps) {
    const { isDark } = useTheme(); // Lấy trực tiếp từ Context

    const legends = {
        aqi: {
            title: 'AQI Risk Level',
            items: [
                { color: 'bg-[#10b981]', label: 'Good (0-50)' },
                { color: 'bg-[#fbbf24]', label: 'Moderate (51-100)' },
                { color: 'bg-[#f97316]', label: 'Sensitive (101-150)' },
                { color: 'bg-[#ef4444]', label: 'Unhealthy (151-200)' },
                { color: 'bg-[#a855f7]', label: 'Hazardous (201+)' },
            ]
        },
        temp: {
            title: 'Temperature (°C)',
            items: [
                { color: 'bg-[#3b82f6]', label: 'Cool (< 24°C)' },
                { color: 'bg-[#10b981]', label: 'Optimal (24-28°C)' },
                { color: 'bg-[#fbbf24]', label: 'Warm (29-33°C)' },
                { color: 'bg-[#f97316]', label: 'Hot (34-37°C)' },
                { color: 'bg-[#ef4444]', label: 'Extreme (> 37°C)' },
            ]
        },
        rain: {
            title: 'Rainfall (mm)',
            items: [
                { color: 'bg-gray-300 dark:bg-gray-600', label: 'Dry (0 mm)' },
                { color: 'bg-[#7dd3fc]', label: 'Light (0.1 - 5)' },
                { color: 'bg-[#38bdf8]', label: 'Moderate (5 - 15)' },
                { color: 'bg-[#0284c7]', label: 'Heavy (15 - 50)' },
                { color: 'bg-[#1e3a8a]', label: 'Violent (> 50)' },
            ]
        }
    };

    const currentLegend = legends[activeLayer];

    return (
        <div className={`absolute bottom-3 right-3 z-[400] rounded-lg px-2.5 py-2 shadow-lg border backdrop-blur-md transition-colors ${
            isDark ? 'bg-[#101010]/75 border-[#2a2a2a]' : 'bg-white/75 border-gray-200'
        }`}>
            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {currentLegend.title}
            </p>
            
            <div className="flex flex-col gap-1">
                {currentLegend.items.map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${item.color} border border-white/20 shadow-sm`}></div>
                        <span className={`text-[9px] font-medium tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {item.label}
                        </span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5 mt-1 border-t border-gray-500/30 pt-1">
                    <div className="w-2 h-2 rounded-full bg-slate-500 border border-white/20 shadow-sm"></div>
                    <span className={`text-[9px] font-medium tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Offline / N/A</span>
                </div>
            </div>
        </div>
    );
}