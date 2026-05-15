import React from 'react';
import type { LayerId } from './InteractiveMap';
import { useTheme } from '../../../contexts/ThemeContext';

interface MapLegendProps {
    activeLayer?: LayerId;
}

const legendConfig: Record<LayerId, { title: string; gradient: string; ticks: string[] }> = {
    aqi: {
        title: 'AQI Risk Level',
        gradient: 'linear-gradient(to right, #10b981, #fbbf24, #f97316, #ef4444, #a855f7)',
        ticks: ['Good', 'Moderate', 'Sensitive', 'Unhealthy', 'Hazardous'],
    },
    temp: {
        title: 'Temperature (°C)',
        gradient: 'linear-gradient(to right, #3b82f6, #10b981, #fbbf24, #f97316, #ef4444)',
        ticks: ['<24°', '24-28°', '29-33°', '34-37°', '>37°'],
    },
    rain: {
        title: 'Rainfall (mm)',
        gradient: 'linear-gradient(to right, #9ca3af, #7dd3fc, #38bdf8, #0284c7, #1e3a8a)',
        ticks: ['Dry', 'Light', 'Moderate', 'Heavy', 'Violent'],
    },
};

export default function MapLegend({ activeLayer = 'aqi' }: MapLegendProps) {
    const { isDark } = useTheme();
    const config = legendConfig[activeLayer];

    return (
        <div
            className={`absolute bottom-5 z-[400] rounded-lg px-3 py-2.5 shadow-lg border backdrop-blur-md transition-colors ${
                isDark ? 'bg-[#101010]/80 border-[#2a2a2a]' : 'bg-white/80 border-gray-200'
            }`}
            style={{ left: 210, minWidth: 260 }}
        >
            <p className={`text-[9px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {config.title}
            </p>

            <div className="w-full h-2 rounded-full mb-1.5" style={{ background: config.gradient }} />

            <div className="flex justify-between">
                {config.ticks.map((tick) => (
                    <span key={tick} className={`text-[8px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {tick}
                    </span>
                ))}
            </div>

            <div className={`mt-2 pt-1.5 border-t flex items-center gap-1.5 ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
                <div className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                <span className={`text-[8px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Offline / No Data
                </span>
            </div>
        </div>
    );
}
