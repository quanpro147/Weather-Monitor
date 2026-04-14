import React from 'react';

export default function MapLegend({ isDark = true }: { isDark?: boolean }) {
    return (
        <div className={`absolute bottom-3 right-3 z-[400] rounded-lg px-2.5 py-2 shadow-lg border backdrop-blur-md transition-colors ${
            isDark ? 'bg-[#101010]/75 border-[#2a2a2a]' : 'bg-white/75 border-gray-200'
        }`}>
            <p className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                AQI Risk
            </p>
            
            <div className="flex flex-col gap-1">
                {[
                    { color: 'bg-[#10b981]', label: 'Good (0-50)' },
                    { color: 'bg-[#fbbf24]', label: 'Moderate (51-100)' },
                    { color: 'bg-[#f97316]', label: 'Sensitive (101-150)' },
                    { color: 'bg-[#ef4444]', label: 'Unhealthy (151-200)' },
                    { color: 'bg-[#a855f7]', label: 'Hazardous (201+)' },
                    { color: 'bg-slate-500', label: 'Offline / N/A' },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${item.color} border border-white/20 shadow-sm`}></div>
                        <span className={`text-[9px] font-medium tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            {item.label}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}