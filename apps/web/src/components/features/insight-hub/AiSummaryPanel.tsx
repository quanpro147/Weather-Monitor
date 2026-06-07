"use client";

import useSWR from "swr";
import {
    Sparkles,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    CalendarDays,
    ShieldCheck,
    ShieldAlert,
    ShieldX,
} from "lucide-react";
import { getWeatherSummary } from '../../../services/summary.service';
import { useTheme } from '../../../contexts/ThemeContext';

interface AiSummaryPanelProps {
    cityId: number | null;
}

const TREND_CONFIG = {
    warming: { label: 'Ấm Lên (Warming)', Icon: TrendingUp, color: 'text-red-400' },
    cooling: { label: 'Lạnh Đi (Cooling)', Icon: TrendingDown, color: 'text-blue-400' },
    stable: { label: 'Ổn Định (Stable)', Icon: Minus, color: 'text-emerald-400' },
} as const;

// Labels matching the 4-question prompt structure
const SECTION_LABELS = ['XU HƯỚNG', 'PATTERN', 'DỰ ĐOÁN', 'THỰC TẾ'];
const SECTION_ICONS = ['fa-chart-line', 'fa-magnifying-glass-chart', 'fa-brain', 'fa-lightbulb'];
const SECTION_COLORS = [
    'text-blue-400',
    'text-amber-400',
    'text-purple-400',
    'text-emerald-400',
];

const CONFIDENCE_CONFIG = {
    high: {
        Icon: ShieldCheck,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        label: 'Độ tin cậy cao',
    },
    medium: {
        Icon: ShieldAlert,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        label: 'Độ tin cậy trung bình',
    },
    low: {
        Icon: ShieldX,
        color: 'text-red-400',
        bg: 'bg-red-500/10 border-red-500/20',
        label: 'Độ tin cậy thấp',
    },
} as const;

export default function AiSummaryPanel({ cityId }: AiSummaryPanelProps) {
    const { isDark } = useTheme();

    const { data: summary, error, isLoading } = useSWR(
        cityId !== null ? `summary:${cityId}` : null,
        () => getWeatherSummary(cityId as number),
    );

    const highlightKeywords = (text: string) => {
        const pattern = /(nguy hiểm|cảnh báo|bất thường|mưa lớn|nắng nóng|lũ lụt|gió mạnh|sương mù|cực đoan|hazardous|warning|anomaly|heavy rain|heat wave|flooding|strong wind|fog|extreme|abnormal)/gi;
        const segments = text.split(pattern);
        return segments.map((segment, index) => {
            if (segment.match(pattern)) {
                return (
                    <mark
                        key={`${segment}-${index}`}
                        className={isDark ? 'bg-red-500/20 text-red-300 px-1 rounded' : 'bg-red-100 text-red-700 px-1 rounded'}
                    >
                        {segment}
                    </mark>
                );
            }
            return <span key={`${segment}-${index}`}>{segment}</span>;
        });
    };

    // Split on sentence boundaries; each of the 4 sections is one "paragraph"
    const summaryParagraphs = summary?.summary_text
        ? summary.summary_text
            .split(/(?<=[.!?])\s+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
        : [];

    /* ── Empty state ─────────────────────────────────────────────────────── */
    if (cityId === null) {
        return (
            <div className={`p-6 rounded-xl border shadow-sm ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>Phân Tích &amp; Tóm Tắt Từ AI</h3>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Chọn thành phố từ bộ lọc phía trên để xem phân tích thời tiết tự động từ AI.
                </p>
            </div>
        );
    }

    /* ── Loading ─────────────────────────────────────────────────────────── */
    if (isLoading) {
        return (
            <div className={`p-6 rounded-xl border shadow-sm ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                </div>
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ width: `${85 - i * 8}%` }} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── Error ───────────────────────────────────────────────────────────── */
    if (error || !summary) {
        return (
            <div className={`p-6 rounded-xl shadow-sm flex items-start gap-3 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                    <h3 className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>Không thể tạo tóm tắt</h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-red-200/80' : 'text-red-600'}`}>
                        Lỗi khi kết nối dịch vụ AI.
                    </p>
                </div>
            </div>
        );
    }

    const trend = TREND_CONFIG[summary.trend_direction] ?? TREND_CONFIG.stable;
    const TrendIcon = trend.Icon;

    const confidenceLevel = (summary as any).confidence_level as 'high' | 'medium' | 'low' | undefined ?? 'medium';
    const confidenceScore = (summary as any).confidence_score as number | undefined ?? 50;
    const confidenceReason = (summary as any).confidence_reason as string | undefined ?? '';
    const conf = CONFIDENCE_CONFIG[confidenceLevel];
    const ConfIcon = conf.Icon;

    return (
        <div className={`p-6 rounded-xl shadow-sm relative overflow-hidden border ${isDark ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20' : 'bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20'}`}>
            {/* AI badge */}
            <div className="absolute top-3 right-3 z-20">
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${isDark ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
                    Tạo bởi AI
                </span>
            </div>

            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40" />

            <div className="relative z-10">
                {/* Title row */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Tóm Tắt & Phân Tích Thời Tiết AI
                        </h3>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-100 dark:bg-blue-500/20 dark:text-blue-300 px-2.5 py-1 rounded-full mr-20">
                        {summary.provider}
                    </span>
                </div>

                {/* Metadata strip */}
                <div className={`mb-4 flex flex-wrap gap-2 rounded-lg p-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-center gap-1.5">
                        <CalendarDays className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                        <span className={`text-[10px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                            Chu kỳ {summary.period_days} ngày
                        </span>
                    </div>

                    <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>

                    <div className="flex items-center gap-1.5">
                        <TrendIcon className={`w-3.5 h-3.5 ${trend.color}`} />
                        <span className={`text-[10px] font-semibold ${trend.color}`}>{trend.label}</span>
                    </div>

                    <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>

                    <div className="flex items-center gap-1.5">
                        <AlertTriangle className={`w-3.5 h-3.5 ${summary.anomaly_count > 0 ? 'text-amber-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`text-[10px] font-semibold ${summary.anomaly_count > 0 ? 'text-amber-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Phát hiện {summary.anomaly_count} ngày bất thường
                        </span>
                    </div>
                </div>

                {/* Confidence badge */}
                <div className={`mb-4 flex items-center gap-2 rounded-lg border px-3 py-2 ${conf.bg}`}>
                    <ConfIcon className={`w-4 h-4 shrink-0 ${conf.color}`} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${conf.color}`}>
                                {conf.label}
                            </span>
                            {/* Score bar */}
                            <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden max-w-[80px]">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                        confidenceLevel === 'high' ? 'bg-emerald-400' :
                                        confidenceLevel === 'medium' ? 'bg-amber-400' : 'bg-red-400'
                                    }`}
                                    style={{ width: `${confidenceScore}%` }}
                                />
                            </div>
                            <span className={`text-[9px] font-bold ${conf.color}`}>{confidenceScore}%</span>
                        </div>
                        {confidenceReason && (
                            <p className={`text-[9px] mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {confidenceReason}
                            </p>
                        )}
                    </div>
                </div>

                {/* 4-question content */}
                <ul className="space-y-3">
                    {summaryParagraphs.map((paragraph, index) => {
                        const label = SECTION_LABELS[index];
                        const icon = SECTION_ICONS[index];
                        const color = SECTION_COLORS[index];
                        return (
                            <li key={`summary-line-${index}`} className={`rounded-lg px-3 py-2.5 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                                {label && (
                                    <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
                                        <i className={`fa-solid ${icon} text-[9px]`} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                                    </div>
                                )}
                                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                    {highlightKeywords(paragraph)}
                                </p>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}