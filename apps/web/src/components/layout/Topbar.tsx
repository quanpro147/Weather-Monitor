import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalFilter, type DateRangePreset, type ScopeMode } from '../../hooks/useGlobalFilter';
import { useTheme } from '../../contexts/ThemeContext';
import { listCities } from '../../services/city.service';
import type { City } from '../../types/city';
import { formatLastUpdatedDate, formatTimeInTimezone, getTimezoneAbbr, getTimezoneForCountry } from '../../utils/timezone';

interface SearchableOption { value: string; label: string; }

function SearchableSelect({
    value, onChange, options, placeholder = 'Search...', disabled = false, width, isDark,
}: {
    value: string;
    onChange: (v: string) => void;
    options: SearchableOption[];
    placeholder?: string;
    disabled?: boolean;
    width?: string;
    isDark: boolean;
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

    const filtered = useMemo(() => {
        if (!query) return options;
        const q = query.toLowerCase();
        return options.filter((o) => o.label.toLowerCase().includes(q));
    }, [query, options]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (v: string) => {
        onChange(v);
        setOpen(false);
        setQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
        else if (e.key === 'Enter') { if (filtered[highlighted]) handleSelect(filtered[highlighted].value); }
        else if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
    };

    const base = isDark
        ? 'bg-[#1a1d21] border-[#2a2d33] text-[#e5e7eb]'
        : 'bg-gray-50 border-gray-200 text-gray-900';

    return (
        <div ref={containerRef} className="relative" style={{ width }}>
            <div
                className={`flex items-center rounded-md border px-2 py-1 cursor-text ${base} ${open ? 'ring-1 ring-cyan-500' : ''}`}
                onClick={() => { setOpen(true); inputRef.current?.focus(); }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={open ? query : selectedLabel}
                    onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }}
                    onFocus={() => { setOpen(true); setQuery(''); }}
                    onKeyDown={handleKeyDown}
                    placeholder={disabled ? 'Loading...' : placeholder}
                    disabled={disabled}
                    className={`bg-transparent outline-none w-full text-xs font-bold min-w-0 ${
                        isDark ? 'text-[#e5e7eb] placeholder-gray-600' : 'text-gray-900 placeholder-gray-400'
                    }`}
                />
                <i className={`fa-solid fa-chevron-down text-[8px] shrink-0 ml-1 transition-transform ${open ? 'rotate-180' : ''} ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
            {open && filtered.length > 0 && (
                <div className={`absolute top-full mt-1 left-0 rounded-md border shadow-lg z-[9999] max-h-52 overflow-y-auto ${
                    isDark ? 'bg-[#1a1d21] border-[#2a2d33]' : 'bg-white border-gray-200'
                }`} style={{ minWidth: '100%' }}>
                    {filtered.map((opt, i) => (
                        <button
                            key={opt.value}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(opt.value)}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                                i === highlighted
                                    ? (isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-700')
                                    : (isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-50')
                            } ${opt.value === value ? 'font-bold' : ''}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
            {open && filtered.length === 0 && query && (
                <div className={`absolute top-full mt-1 left-0 rounded-md border shadow-lg z-[9999] px-3 py-2 text-xs ${
                    isDark ? 'bg-[#1a1d21] border-[#2a2d33] text-gray-500' : 'bg-white border-gray-200 text-gray-400'
                }`} style={{ minWidth: '100%' }}>
                    No results
                </div>
            )}
        </div>
    );
}

export default function Topbar() {
    const { isDark, toggleTheme } = useTheme();
    const { cityId, setCityId, scopeMode, setScopeMode, selectedCountry, setSelectedCountry, dateRangePreset, setDateRangePreset, lastUpdatedDate } = useGlobalFilter();
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
                        <SearchableSelect
                            value={selectedCountry}
                            onChange={handleCountryChange}
                            options={[{ value: '', label: 'All Countries' }, ...countries.map((c) => ({ value: c, label: c }))]}
                            placeholder="Search country..."
                            isDark={isDark}
                            width="110px"
                        />
                    </label>
                )}

                <label className="hidden md:flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-[#8b949e]">
                    City
                    <SearchableSelect
                        value={String(cityId ?? '')}
                        onChange={(v) => setCityId(v ? Number(v) : null)}
                        options={visibleCities.map((item) => ({ value: String(item.city_id), label: item.city }))}
                        placeholder="Search city..."
                        disabled={loadingCities}
                        isDark={isDark}
                        width="120px"
                    />
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