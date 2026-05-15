import React, { useEffect, useState } from 'react';
import { useGlobalFilter, type DateRangePreset, type ScopeMode } from '../../hooks/useGlobalFilter';
import { useTheme } from '../../contexts/ThemeContext';
import { listCities } from '../../services/city.service';
import type { City } from '../../types/city';
import { formatLastUpdatedDate, formatTimeInTimezone, getTimezoneAbbr, getTimezoneForCountry } from '../../utils/timezone';

export default function Topbar() {
    const { isDark, toggleTheme } = useTheme();
    const { cityId, setCityId, scopeMode, setScopeMode, dateRangePreset, setDateRangePreset, lastUpdatedDate } = useGlobalFilter();
    const [cities, setCities] = useState<City[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<string>('');

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
                let data: City[];

                if (scopeMode === 'vietnam') {
                    const vnByCanonical = await listCities({ country: 'Viet Nam' });
                    data = vnByCanonical.length > 0 ? vnByCanonical : await listCities({ country: 'Vietnam' });
                } else {
                    data = await listCities();
                }

                if (!active) return;

                setCities(data);

                const hasSelectedCity = cityId !== null && data.some((item) => item.city_id === cityId);
                if (!hasSelectedCity) {
                    setCityId(data.length > 0 ? data[0].city_id : null);
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

        if (scopeMode === 'vietnam') {
            setSelectedCountry('');
        }

        void fetchCities();

        return () => {
            active = false;
        };
    }, [scopeMode, setCityId]);

    const countries = React.useMemo(() => {
        if (scopeMode !== 'global') return [];
        const seen = new Set<string>();
        return cities
            .map((c) => c.country)
            .filter((country) => {
                if (seen.has(country)) return false;
                seen.add(country);
                return true;
            })
            .sort();
    }, [cities, scopeMode]);

    const visibleCities = React.useMemo(() => {
        if (scopeMode !== 'global' || !selectedCountry) return cities;
        return cities.filter((c) => c.country === selectedCountry);
    }, [cities, scopeMode, selectedCountry]);

    const selectedCity = React.useMemo(
        () => cities.find(c => c.city_id === cityId) ?? null,
        [cities, cityId]
    );
    const timezone = React.useMemo(
        () => getTimezoneForCountry(selectedCity?.country),
        [selectedCity]
    );
    const tzAbbr = React.useMemo(() => getTimezoneAbbr(timezone), [timezone]);

    const handleCountryChange = (country: string) => {
        setSelectedCountry(country);
        const first = cities.find((c) => c.country === country);
        setCityId(first ? first.city_id : null);
    };

    return (
        <header className="h-[64px] w-full bg-white dark:bg-[#16181c] border-b border-gray-200 dark:border-[#2a2d33] px-6 flex items-center justify-between shrink-0 transition-colors duration-300">
            <div></div>

            {/* Right Area: Clock & Controls */}
            <div className="flex items-center gap-4">
                {/* Real-time Clock + Last Updated */}
                {mounted && (
                    <div className="hidden lg:flex items-center gap-2 text-gray-600 dark:text-[#9ca3af] font-mono text-sm font-semibold bg-gray-50 dark:bg-[#1a1d21] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-[#2a2d33] shadow-sm">
                        <i className="fa-regular fa-clock text-cyan-600 dark:text-cyan-400"></i>
                        <span>{formatTimeInTimezone(time, timezone)} <span className="text-[10px] font-sans font-bold text-gray-400 ml-0.5">{tzAbbr}</span></span>
                        {lastUpdatedDate && (
                            <span className="text-[10px] font-sans font-medium text-gray-400 dark:text-[#6b7280] border-l border-gray-200 dark:border-[#2a2d33] pl-2 ml-0.5 flex items-center gap-1">
                                <i className="fa-regular fa-calendar-check text-cyan-500/70"></i>
                                {formatLastUpdatedDate(lastUpdatedDate)}
                            </span>
                        )}
                    </div>
                )}

                <div className="h-5 w-[1px] bg-gray-200 dark:bg-[#2a2d33] hidden md:block mx-1"></div>

                {/* Filters */}
                <label className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8b949e]">
                    Scope
                    <select
                        value={scopeMode}
                        onChange={(e) => setScopeMode(e.target.value as ScopeMode)}
                        className="rounded-md border border-gray-200 dark:border-[#2a2d33] bg-gray-50 dark:bg-[#1a1d21] px-2 py-1 text-xs font-bold text-gray-900 dark:text-[#e5e7eb] outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
                    >
                        <option value="vietnam">Viet Nam</option>
                        <option value="global">Global</option>
                    </select>
                </label>

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

                {scopeMode === 'global' && (
                    <label className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8b949e]">
                        Country
                        <select
                            value={selectedCountry}
                            onChange={(e) => handleCountryChange(e.target.value)}
                            className="w-[110px] rounded-md border border-gray-200 dark:border-[#2a2d33] bg-gray-50 dark:bg-[#1a1d21] px-2 py-1 text-xs font-bold text-gray-900 dark:text-[#e5e7eb] outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer truncate"
                        >
                            <option value="">All Countries</option>
                            {countries.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </label>
                )}

                <label className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8b949e]">
                    City
                    <select
                        value={cityId ?? ''}
                        onChange={(e) => setCityId(e.target.value ? Number(e.target.value) : null)}
                        className="w-[120px] rounded-md border border-gray-200 dark:border-[#2a2d33] bg-gray-50 dark:bg-[#1a1d21] px-2 py-1 text-xs font-bold text-gray-900 dark:text-[#e5e7eb] outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer truncate"
                    >
                        {loadingCities ? (
                            <option value="">Loading...</option>
                        ) : visibleCities.length === 0 ? (
                            <option value="">No cities</option>
                        ) : (
                            visibleCities.map((item) => (
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