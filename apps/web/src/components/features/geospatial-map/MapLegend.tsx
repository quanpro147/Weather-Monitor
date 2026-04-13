import React from 'react';

export default function MapLegend({ isDark = true }: { isDark?: boolean }) {
    return (
        <div className={`absolute bottom-4 right-4 z-[400] rounded-xl p-3 shadow-lg border backdrop-blur-md ${isDark ? 'bg-[#101010]/90 border-[#2a2a2a]' : 'bg-white/90 border-gray-200'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>AQI Risk Level</p>
            
            <div className="flex flex-col gap-2">
                {[
                    { color: 'bg-[#10b981]', label: 'Good (0-50)' },
                    { color: 'bg-[#fbbf24]', label: 'Moderate (51-100)' },
                    { color: 'bg-[#f97316]', label: 'Unhealthy for Sensitive (101-150)' },
                    { color: 'bg-[#ef4444]', label: 'Unhealthy (151-200)' },
                    { color: 'bg-[#a855f7]', label: 'Very Unhealthy (201+)' },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color} border border-white/20`}></div>
                        <span className={`text-[10px] font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}