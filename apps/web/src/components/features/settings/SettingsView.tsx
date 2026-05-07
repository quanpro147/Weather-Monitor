import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface SettingRowProps {
    label: string;
    value: string;
    mono?: boolean;
    isDark: boolean;
}

function SettingRow({ label, value, mono, isDark }: SettingRowProps) {
    const subtext = isDark ? 'text-[#9ca3af]' : 'text-gray-500';
    const text = isDark ? 'text-[#f3f4f6]' : 'text-gray-900';
    return (
        <div className="flex items-center justify-between py-3">
            <span className={`text-sm ${subtext}`}>{label}</span>
            <span className={`text-sm font-semibold ${mono ? 'font-mono' : ''} ${text}`}>{value}</span>
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
    const surface = isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200';
    const text = isDark ? 'text-[#f3f4f6]' : 'text-gray-900';
    const divider = isDark ? 'divide-[#2a2a2a]' : 'divide-gray-100';
    return (
        <div className={`rounded-2xl border p-5 ${surface}`}>
            <div className="flex items-center gap-2 mb-4">
                <i className={`fa-solid ${icon} text-cyan-500 text-xs`} />
                <h3 className={`text-xs font-black uppercase tracking-widest ${text}`}>{title}</h3>
            </div>
            <div className={`divide-y ${divider}`}>{children}</div>
        </div>
    );
}

export default function SettingsView() {
    const { isDark, toggleTheme } = useTheme();
    const text = isDark ? 'text-[#f3f4f6]' : 'text-gray-900';
    const subtext = isDark ? 'text-[#9ca3af]' : 'text-gray-500';

    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="shrink-0">
                <h2 className={`text-xl font-black tracking-tight ${text}`}>System Settings</h2>
                <p className={`text-xs font-medium mt-1 ${subtext}`}>Configuration and system information</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Appearance */}
                <Section title="Appearance" icon="fa-palette" isDark={isDark}>
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className={`text-sm font-semibold ${text}`}>Dark Mode</p>
                            <p className={`text-xs mt-0.5 ${subtext}`}>Switch between light and dark theme</p>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${isDark ? 'focus:ring-offset-[#151515]' : 'focus:ring-offset-white'} ${isDark ? 'bg-cyan-500' : 'bg-gray-300'}`}
                            aria-label="Toggle dark mode"
                        >
                            <span
                                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`}
                            />
                        </button>
                    </div>
                    <SettingRow label="Current Theme" value={isDark ? 'Dark' : 'Light'} isDark={isDark} />
                </Section>

                {/* API Configuration */}
                <Section title="API Configuration" icon="fa-plug" isDark={isDark}>
                    <SettingRow label="Backend URL" value={apiBase} mono isDark={isDark} />
                    <SettingRow label="Supabase" value="Connected" isDark={isDark} />
                    <SettingRow label="Redis Cache" value="Active" isDark={isDark} />
                    <SettingRow label="Data Source" value="Open-Meteo Archive" isDark={isDark} />
                </Section>

                {/* System Info */}
                <Section title="System Information" icon="fa-circle-info" isDark={isDark}>
                    <SettingRow label="Project" value="Weather Monitor" isDark={isDark} />
                    <SettingRow label="Institution" value="University — Nam 3 HKII" isDark={isDark} />
                    <SettingRow label="Frontend" value="Next.js 14 + Tailwind CSS" isDark={isDark} />
                    <SettingRow label="Backend" value="FastAPI + Supabase" isDark={isDark} />
                </Section>

                {/* ML & AI */}
                <Section title="ML & AI" icon="fa-brain" isDark={isDark}>
                    <SettingRow label="Anomaly Detection" value="Isolation Forest" isDark={isDark} />
                    <SettingRow label="LLM Summary" value="Gemini 2.5 Flash" isDark={isDark} />
                    <SettingRow label="Clustering" value="K-Means" isDark={isDark} />
                    <SettingRow label="EDA Pipeline" value="Pandas + NumPy" isDark={isDark} />
                </Section>
            </div>
        </div>
    );
}
