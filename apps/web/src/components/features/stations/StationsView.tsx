import React from 'react';
import useSWR from 'swr';
import { useTheme } from '../../../contexts/ThemeContext';
import { listCities } from '../../../services/city.service';
import type { City } from '../../../types/city';

export default function StationsView() {
    const { isDark } = useTheme();
    const [search, setSearch] = React.useState('');

    const { data: cities, isLoading, error } = useSWR<City[]>(
        'stations:cities:vietnam',
        () => listCities({ country: 'Vietnam', limit: 200 }),
    );

    const filtered = React.useMemo(() => {
        if (!cities) return [];
        const q = search.trim().toLowerCase();
        if (!q) return cities;
        return cities.filter((c) => c.city.toLowerCase().includes(q));
    }, [cities, search]);

    const surface = isDark ? 'bg-[#151515] border-[#2a2a2a]' : 'bg-white border-gray-200';
    const text = isDark ? 'text-[#f3f4f6]' : 'text-gray-900';
    const subtext = isDark ? 'text-[#9ca3af]' : 'text-gray-500';
    const inputBg = isDark ? 'bg-[#1e1e1e] border-[#2a2a2a] text-[#f3f4f6] placeholder-[#4b5563]' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400';
    const rowHover = isDark ? 'hover:bg-[#1e1e1e]' : 'hover:bg-gray-50';
    const divider = isDark ? 'divide-[#2a2a2a]' : 'divide-gray-100';
    const headerBg = isDark ? 'bg-[#1a1a1a] text-[#9ca3af]' : 'bg-gray-50 text-gray-500';

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h2 className={`text-xl font-black tracking-tight ${text}`}>Station Management</h2>
                    <p className={`text-xs font-medium mt-1 ${subtext}`}>
                        Monitoring stations across Vietnam
                    </p>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${isDark ? 'bg-emerald-950 border-emerald-800 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    All Online
                </div>
            </div>

            {/* Search */}
            <div className="shrink-0">
                <div className="relative">
                    <i className={`fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs ${subtext}`} />
                    <input
                        type="text"
                        placeholder="Search stations..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`w-full pl-8 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 ${inputBg}`}
                    />
                </div>
            </div>

            {/* Table */}
            <div className={`rounded-2xl border overflow-hidden flex-1 min-h-0 flex flex-col ${surface}`}>
                {/* Table header */}
                <div className={`grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-5 py-3 text-xs font-bold uppercase tracking-widest shrink-0 ${headerBg}`}>
                    <span>Station</span>
                    <span>Country</span>
                    <span>Latitude</span>
                    <span>Longitude</span>
                    <span className="text-right">Status</span>
                </div>

                {/* Body */}
                <div className={`overflow-y-auto flex-1 divide-y ${divider}`}>
                    {isLoading && (
                        <div className={`flex flex-col items-center justify-center h-[300px] gap-3 ${subtext}`}>
                            <i className="fa-solid fa-circle-notch fa-spin text-2xl text-cyan-500" />
                            <span className="text-sm">Loading stations...</span>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className={`flex flex-col items-center justify-center h-[300px] gap-3 ${subtext}`}>
                            <i className="fa-solid fa-triangle-exclamation text-2xl text-red-400" />
                            <span className="text-sm">Failed to load stations. Check API connection.</span>
                        </div>
                    )}

                    {!isLoading && !error && filtered.length === 0 && (
                        <div className={`flex flex-col items-center justify-center h-[300px] gap-3 ${subtext}`}>
                            <i className="fa-solid fa-satellite-dish text-2xl" />
                            <span className="text-sm">No stations match your search.</span>
                        </div>
                    )}

                    {!isLoading && !error && filtered.map((city) => (
                        <div
                            key={city.city_id}
                            className={`grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-5 py-3.5 items-center transition-colors ${rowHover}`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-[#2a2a2a]' : 'bg-gray-100'}`}>
                                    <i className={`fa-solid fa-satellite-dish text-xs text-cyan-500`} />
                                </div>
                                <span className={`text-sm font-semibold truncate ${text}`}>{city.city}</span>
                            </div>
                            <span className={`text-sm ${subtext}`}>{city.country}</span>
                            <span className={`text-sm font-mono ${subtext}`}>{city.latitude.toFixed(4)}</span>
                            <span className={`text-sm font-mono ${subtext}`}>{city.longitude.toFixed(4)}</span>
                            <div className="flex justify-end">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-emerald-950 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Online
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                {!isLoading && !error && cities && (
                    <div className={`px-5 py-3 border-t text-xs font-medium shrink-0 ${subtext} ${isDark ? 'border-[#2a2a2a]' : 'border-gray-100'}`}>
                        Showing {filtered.length} of {cities.length} stations
                    </div>
                )}
            </div>
        </div>
    );
}
