import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface SettingRowProps {
    label: string;
    value: React.ReactNode; // Đổi sang ReactNode để truyền Badge HTML vào được
    mono?: boolean;
    isDark: boolean;
    copyValue?: string;
}

function SettingRow({ label, value, mono, isDark, copyValue }: SettingRowProps) {
    const subtext = isDark ? 'text-[#9ca3af]' : 'text-gray-500';
    const text = isDark ? 'text-[#f3f4f6]' : 'text-gray-900';
    const handleCopy = () => {
        if (!copyValue || typeof navigator === 'undefined' || !navigator.clipboard) return;
        void navigator.clipboard.writeText(copyValue);
    };
    return (
        <div className="group flex items-center justify-between rounded-md p-2 transition-colors duration-200 hover:bg-white/[0.03] cursor-pointer">
            <span className={`text-sm tracking-wide leading-relaxed ${subtext}`}>{label}</span>
            <span className={`flex items-center justify-end gap-2 text-sm ${mono ? 'font-mono text-xs tracking-tight text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]' : text}`}>
                {value}
                {copyValue && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isDark ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-gray-700'}`}
                        aria-label={`Copy ${label}`}
                    >
                        <i className="fa-solid fa-copy text-[11px]" aria-hidden="true"></i>
                    </button>
                )}
            </span>
        </div>
    );
}

interface SectionProps {
    title: string;
    icon: string;
    children: React.ReactNode;
    isDark: boolean;
}

function Section({ title, icon, children, isDark }: SectionProps) {
    const surface = isDark
        ? 'bg-gradient-to-br from-[#1e1e1e] to-[#121212] border-[#2a2a2a] shadow-2xl shadow-black/50 border-t border-[#2a2a2a]'
        : 'bg-white border-gray-200 shadow-xl shadow-black/5 border-t border-gray-100';
    const text = isDark ? 'text-[#f3f4f6]' : 'text-gray-900';
    const divider = isDark ? 'divide-[#2a2a2a]' : 'divide-gray-100';
    return (
        <div className={`rounded-2xl border p-5 transition-colors ${surface}`}>
            <div className={`flex items-center gap-2 border-b pb-3 mb-4 ${isDark ? 'border-[#2a2a2a]' : 'border-gray-200'}`}>
                <i className={`fa-solid ${icon} text-cyan-600/80 text-sm`} />
                <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-600/80">{title}</h3>
            </div>
            <div className={`divide-y ${divider}`}>{children}</div>
        </div>
    );
}

// Component phụ để render Status Badge chuẩn SCADA
const StatusBadge = ({ isDark, text }: { isDark: boolean, text: string }) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-[inset_0_1px_4px_rgba(0,0,0,0.5)] border ${
        isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
    }`}>
        <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        {text}
    </span>
);

export default function SettingsView() {
    const { isDark, toggleTheme } = useTheme();
    const text = isDark ? 'text-[#f3f4f6]' : 'text-gray-900';
    const subtext = isDark ? 'text-[#9ca3af]' : 'text-gray-500';

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

    return (
        <div className="mx-auto w-full max-w-[1500px] flex flex-col gap-6 h-full animate-in fade-in duration-700">
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between">
                <div>
                    <h2 className={`text-xl font-black tracking-tight ${text}`}>System Settings</h2>
                    <p className={`text-xs font-medium mt-1 ${subtext}`}>Configuration, connections and environment parameters</p>
                </div>
                <div className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${isDark ? 'bg-[#151515] border-[#2a2a2a] text-gray-500' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                    Version 1.0.0
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Appearance */}
                <Section title="Appearance" icon="fa-palette" isDark={isDark}>
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className={`text-sm font-semibold tracking-wide ${text}`}>Dark Mode</p>
                            <p className={`text-[10px] mt-0.5 leading-relaxed tracking-wide ${subtext}`}>Switch between high-contrast light and dark themes</p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-[#151515] bg-cyan-500' : 'focus:ring-offset-white bg-gray-300'}`}
                            aria-label="Toggle dark mode"
                        >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <SettingRow label="Current Active Theme" value={isDark ? 'SCADA Dark' : 'Clean Light'} isDark={isDark} />
                </Section>

                {/* API Configuration */}
                <Section title="Data Pipeline & APIs" icon="fa-network-wired" isDark={isDark}>
                    <SettingRow label="Backend Endpoint" value={apiBase} mono isDark={isDark} copyValue={apiBase} />
                    <SettingRow label="Supabase Database" value={<StatusBadge isDark={isDark} text="Connected" />} isDark={isDark} />
                    <SettingRow label="Redis Caching Layer" value={<StatusBadge isDark={isDark} text="Active" />} isDark={isDark} />
                    <SettingRow label="Primary Data Source" value="Open-Meteo Archive" isDark={isDark} />
                </Section>

                {/* System Info */}
                <Section title="System Information" icon="fa-server" isDark={isDark}>
                    <SettingRow label="Project Name" value="Weather Monitor Platform" isDark={isDark} />
                    <SettingRow label="Institution" value="VNU-HCM University of Science" isDark={isDark} />
                    <SettingRow label="Frontend Framework" value="Next.js 14 + Tailwind CSS" isDark={isDark} />
                    <SettingRow label="Backend Architecture" value="FastAPI (Python)" isDark={isDark} />
                </Section>

                {/* ML & AI */}
                <Section title="Machine Learning Engine" icon="fa-microchip" isDark={isDark}>
                    <SettingRow label="Anomaly Detection" value="Isolation Forest" isDark={isDark} />
                    <SettingRow label="LLM Synthesis" value={
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-bold ${
                            isDark
                                ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 text-blue-400'
                                : 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20 text-blue-600'
                        }`}>
                            <i className="fa-solid fa-sparkles text-[10px]" aria-hidden="true"></i>
                            Gemini 2.5 Flash
                        </span>
                    } isDark={isDark} />
                    <SettingRow label="Pattern Clustering" value="K-Means (k=3)" isDark={isDark} />
                    <SettingRow label="EDA Processor" value="Pandas + NumPy" isDark={isDark} />
                </Section>
            </div>
        </div>
    );
}