import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import type { CategoryDistribution, CityWeatherInfo } from '../../../hooks/useWeatherClassification';

interface WeatherClassificationPanelProps {
    distribution: CategoryDistribution[];
    totalCities: number;
    isLoading: boolean;
    error: string | null;
    onCityClick?: (cityId: number) => void;
}

export default function WeatherClassificationPanel({
    distribution,
    totalCities,
    isLoading,
    error,
    onCityClick,
}: WeatherClassificationPanelProps) {
    const { isDark } = useTheme();
    const [expandedKey, setExpandedKey] = React.useState<string | null>(null);

    const surface = isDark
        ? 'bg-[#1e1e1e] border-[#2a2a2a]'
        : 'bg-white border-gray-200';
    const subtext = isDark ? 'text-gray-500' : 'text-gray-400';
    const text = isDark ? 'text-[#f3f4f6]' : 'text-gray-900';
    const rowHover = isDark ? 'hover:bg-[#252525]' : 'hover:bg-gray-50';
    const divider = isDark ? 'border-[#2a2a2a]' : 'border-gray-100';

    /* ── Loading skeleton ─────────────────────────────────────── */
    if (isLoading) {
        return (
            <div className={`p-6 rounded-2xl border shadow-sm ${surface}`}>
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
                    <div className="h-3 w-44 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                            <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${40 + i * 10}%` }} />
                            <div className="w-8 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /* ── Error state ──────────────────────────────────────────── */
    if (error) {
        return (
            <div className={`p-6 rounded-2xl border shadow-sm ${surface}`}>
                <div className="flex items-center gap-2 text-red-400">
                    <i className="fa-solid fa-triangle-exclamation text-xs" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Failed to load weather classification</p>
                </div>
            </div>
        );
    }

    /* ── Empty state ──────────────────────────────────────────── */
    if (distribution.length === 0) {
        return (
            <div className={`p-6 rounded-2xl border shadow-sm ${surface}`}>
                <div className={`flex flex-col items-center justify-center py-8 ${subtext}`}>
                    <i className="fa-regular fa-cloud text-3xl mb-2 opacity-40" />
                    <p className="text-xs font-semibold">No weather data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`p-6 rounded-2xl border shadow-sm ${surface}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <i className="fa-solid fa-layer-group text-cyan-500 text-xs" />
                    <h3 className={`text-xs font-black uppercase tracking-widest ${text}`}>
                        Weather Classification Overview
                    </h3>
                </div>
                <span className={`text-[10px] font-semibold ${subtext}`}>
                    {totalCities} cities in scope
                </span>
            </div>

            {/* Distribution bars */}
            <div className="space-y-2.5 mb-5">
                {distribution.map(({ category, count, percentage, cities }) => {
                    const isExpanded = expandedKey === category.key;
                    return (
                        <div key={category.key}>
                            {/* Bar row */}
                            <button
                                type="button"
                                onClick={() => setExpandedKey(isExpanded ? null : category.key)}
                                className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg transition-colors ${rowHover} text-left`}
                            >
                                {/* Icon + label */}
                                <div className={`flex items-center gap-1.5 w-28 shrink-0`}>
                                    <i className={`fa-solid ${category.icon} text-[11px] ${category.colorClass}`} />
                                    <span className={`text-[11px] font-bold ${category.colorClass}`}>
                                        {category.label}
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${category.bgClass.replace('bg-', 'bg-').replace('/10', '/60').replace('50', '400')}`}
                                        style={{ width: `${Math.max(percentage, 2)}%` }}
                                    />
                                </div>

                                {/* Count + pct */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[11px] font-black ${text}`}>{count}</span>
                                    <span className={`text-[9px] font-semibold w-7 text-right ${subtext}`}>{percentage}%</span>
                                    <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[8px] ${subtext}`} />
                                </div>
                            </button>

                            {/* Collapsible city list */}
                            {isExpanded && (
                                <div className={`mt-1 ml-2 rounded-lg border ${divider} overflow-hidden`}>
                                    <div className="max-h-48 overflow-y-auto">
                                        {cities.map((info) => (
                                            <CityRow
                                                key={info.cityId}
                                                info={info}
                                                isDark={isDark}
                                                onCityClick={onCityClick}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend footer */}
            <p className={`text-[9px] font-semibold uppercase tracking-widest ${subtext}`}>
                Based on current WMO weather codes · Click a category to expand city list
            </p>
        </div>
    );
}

/* ── Sub-component: single city row ────────────────────────────── */
function CityRow({
    info,
    isDark,
    onCityClick,
}: {
    info: CityWeatherInfo;
    isDark: boolean;
    onCityClick?: (cityId: number) => void;
}) {
    const base = isDark
        ? 'border-[#2a2a2a] hover:bg-[#252525]'
        : 'border-gray-100 hover:bg-gray-50';

    return (
        <button
            type="button"
            onClick={() => onCityClick?.(info.cityId)}
            className={`w-full flex items-center justify-between px-4 py-2 border-b last:border-b-0 transition-colors ${base} ${onCityClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
            <div className="flex items-center gap-2">
                <i className={`fa-solid ${info.category.icon} text-[10px] ${info.category.colorClass}`} />
                <span className={`text-[11px] font-semibold ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {info.cityName}
                </span>
            </div>
            {info.tempMean !== null && (
                <span className={`text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {info.tempMean.toFixed(1)}°C
                </span>
            )}
        </button>
    );
}