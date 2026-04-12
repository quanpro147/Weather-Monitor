import React, { useState } from 'react';

interface TopbarProps {
    isDark: boolean;
    toggleTheme: () => void;
}

export default function Topbar({ isDark, toggleTheme }: TopbarProps) {
    const [dateRange, setDateRange] = useState('today');
    const [city, setCity] = useState('hcmc');

    return (
        <header className="h-[70px] w-full bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-[#2a2a2a] px-6 flex items-center justify-between shrink-0 transition-colors duration-300">
            <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-[#f3f4f6]">Command Center</h1>
                <p className="text-xs text-gray-500 dark:text-[#9ca3af]">National weather and air-quality surveillance</p>
            </div>

            <div className="flex items-center gap-4">
                <label className="hidden md:flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#9ca3af]">
                    Date
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#151515] px-3 py-1.5 text-sm text-gray-900 dark:text-[#f3f4f6] outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                    >
                        <option value="today">Today</option>
                        <option value="24h">Last 24 Hours</option>
                        <option value="7d">Past 7 Days</option>
                    </select>
                </label>

                <label className="hidden md:flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-[#9ca3af]">
                    Scope
                    <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="rounded-lg border border-gray-200 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#151515] px-3 py-1.5 text-sm text-gray-900 dark:text-[#f3f4f6] outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
                    >
                        <option value="hcmc">Ho Chi Minh City</option>
                        <option value="hanoi">Ha Noi</option>
                        <option value="danang">Da Nang</option>
                    </select>
                </label>

                <div className="h-6 w-[1px] bg-gray-200 dark:bg-[#2a2a2a] mx-2"></div>

                <button
                    onClick={toggleTheme}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 dark:bg-[#252830] text-gray-600 dark:text-cyan-300 hover:bg-gray-200 dark:hover:bg-[#2a2d33] transition-colors border border-transparent dark:border-[#38bdf8]/20"
                >
                    <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
                </button>
            </div>
        </header>
    );
}