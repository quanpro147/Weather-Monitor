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
            className={`absolute bottom-3 z-[400] rounded-md px-2 py-1.5 shadow-md border backdrop-blur-md transition-colors ${
                isDark ? 'bg-[#101010]/80 border-[#2a2a2a]' : 'bg-white/80 border-gray-200'
            }`}
            style={{ left: 12, minWidth: 160 }}
        >
            <p className={`text-[8px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {config.title}
            </p>

            <div className="w-full h-1.5 rounded-full mb-1" style={{ background: config.gradient }} />

            <div className="flex justify-between">
                <span className={`text-[7px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{config.ticks[0]}</span>
                <span className={`text-[7px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{config.ticks[config.ticks.length - 1]}</span>
            </div>

            <div className={`mt-1 pt-1 border-t flex items-center gap-1 ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                <span className={`text-[7px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Offline / No Data
                </span>
            </div>
        </div>
    );
}
