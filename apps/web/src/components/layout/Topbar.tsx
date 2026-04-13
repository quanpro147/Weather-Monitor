import React, { useEffect, useState } from 'react';
import { useGlobalFilter, type DateRangePreset } from '../../hooks/useGlobalFilter';
import { listCities } from '../../services/city.service';
import type { City } from '../../types/city';

interface TopbarProps {
    isDark: boolean;
    toggleTheme: () => void;
}

export default function Topbar({ isDark, toggleTheme }: TopbarProps) {
    const { cityId, setCityId, dateRangePreset, setDateRangePreset } = useGlobalFilter();
    const [cities, setCities] = useState<City[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);
    
    // State cho đồng hồ Real-time
    const [time, setTime] = useState(new Date());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Cập nhật thời gian mỗi giây
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        let active = true;

        const fetchCities = async () => {
            setLoadingCities(true);
            try {
                const data = await listCities();
                if (!active) return;
                setCities(data);
                if (cityId === null && data.length > 0) {
                    setCityId(data[0].city_id);
                }
            } catch {
                if (!active) return;
                setCities([]);
            } finally {
                if (active) {
                    setLoadingCities(false);
                }
            }
        };

        void fetchCities();

        return () => {
            active = false;
        };
    }, [cityId, setCityId]);

    // Format giờ: HH:mm:ss
    const formatTime = (date: Date) => {
        const h = String(date.getHours()).padStart(2, '0');
        const m = String(date.getMinutes()).padStart(2, '0');
        const s = String(date.getSeconds()).padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <header className="h-[64px] w-full bg-white dark:bg-[#16181c] border-b border-gray-200 dark:border-[#2a2d33] px-6 flex items-center justify-between shrink-0 transition-colors duration-300">
            {/* Left Area: Title & LIVE Indicator */}
            <div className="flex items-center gap-4">
                <div>
                    <h1 className="text-lg font-black text-gray-900 dark:text-[#f3f4f6] leading-none tracking-tight">Command Center</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#8b949e] mt-1.5">National Surveillance</p>
                </div>
                
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.2em]">LIVE</span>
                </div>
            </div>

            {/* Right Area: Clock & Controls */}
            <div className="flex items-center gap-4">
                {/* Real-time Clock */}
                {mounted && (
                    <div className="hidden lg:flex items-center gap-2 text-gray-600 dark:text-[#9ca3af] font-mono text-sm font-semibold bg-gray-50 dark:bg-[#1a1d21] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#2a2d33] shadow-sm">
                        <i className="fa-regular fa-clock text-cyan-600 dark:text-cyan-400"></i>
                        <span>{formatTime(time)} <span className="text-[10px] font-sans font-bold text-gray-400 ml-0.5">ICT</span></span>
                    </div>
                )}

                <div className="h-5 w-[1px] bg-gray-200 dark:bg-[#2a2d33] hidden md:block mx-1"></div>

                {/* Filters */}
                <label className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8b949e]">
                    Date
                    <select
                        value={dateRangePreset}
                        onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
                        className="rounded-md border border-gray-200 dark:border-[#2a2d33] bg-gray-50 dark:bg-[#1a1d21] px-2 py-1 text-xs font-bold text-gray-900 dark:text-[#e5e7eb] outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
                    >
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Past 7 Days</option>
                        <option value="30d">Past 30 Days</option>
                        <option value="custom">Custom</option>
                    </select>
                </label>

                <label className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8b949e]">
                    Scope
                    <select
                        value={cityId ?? ''}
                        onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
                        className="rounded-md border border-gray-200 dark:border-[#2a2d33] bg-gray-50 dark:bg-[#1a1d21] px-2 py-1 text-xs font-bold text-gray-900 dark:text-[#e5e7eb] outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
                    >
                        {loadingCities ? (
                            <option value="">Loading...</option>
                        ) : (
                            cities.map((item) => (
                                <option key={item.city_id} value={item.city_id}>
                                    {item.city}
                                </option>
                            ))
                        )}
                    </select>
                </label>

                <div className="h-5 w-[1px] bg-gray-200 dark:bg-[#2a2d33] mx-1"></div>

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-[#1a1d21] text-gray-600 dark:text-cyan-400 hover:bg-gray-200 dark:hover:bg-[#2a2d33] transition-colors border border-transparent dark:border-cyan-500/20 shadow-sm"
                >
                    <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
                </button>
            </div>
        </header>
    );
}