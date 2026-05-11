"use client";

import useSWR from "swr";
import { Sparkles, AlertCircle, TrendingUp, TrendingDown, Minus, AlertTriangle, CalendarDays } from "lucide-react";
import { getWeatherSummary } from '../../../services/summary.service';
import { useTheme } from '../../../contexts/ThemeContext';

interface AiSummaryPanelProps {
  cityId: number | null;
}

const TREND_CONFIG = {
  warming: { label: 'Warming', Icon: TrendingUp, color: 'text-red-400' },
  cooling: { label: 'Cooling', Icon: TrendingDown, color: 'text-blue-400' },
  stable: { label: 'Stable', Icon: Minus, color: 'text-emerald-400' },
} as const;

export default function AiSummaryPanel({ cityId }: AiSummaryPanelProps) {
  const { isDark } = useTheme();

  const { data: summary, error, isLoading } = useSWR(
    cityId !== null ? `summary:${cityId}` : null,
    () => getWeatherSummary(cityId as number)
  );

  const highlightKeywords = (text: string) => {
    const pattern = /(hazardous|warning|anomaly|heavy rain|heat wave|flooding|strong wind|fog|extreme|abnormal)/gi;
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

  const summaryParagraphs = summary?.summary_text
    ? summary.summary_text
        .split(/(?<=[.!?])\s+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    : [];

  if (cityId === null) {
    return (
      <div className={`p-6 rounded-xl border shadow-sm ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>AI Analysis & Summary</h3>
        </div>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Select a city to view the AI-generated weather summary.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-6 rounded-xl border shadow-sm ${isDark ? 'bg-[#1e1e1e] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className={`p-6 rounded-xl shadow-sm flex items-start gap-3 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
        <div>
          <h3 className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>Unable to generate summary</h3>
          <p className={`text-sm mt-1 ${isDark ? 'text-red-200/80' : 'text-red-600'}`}>An error occurred while connecting to the AI service.</p>
        </div>
      </div>
    );
  }

  const trend = TREND_CONFIG[summary.trend_direction] ?? TREND_CONFIG.stable;
  const TrendIcon = trend.Icon;

  return (
    <div className={`p-6 rounded-xl shadow-sm relative overflow-hidden border ${isDark ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20' : 'bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20'}`}>
      <div className="absolute top-3 right-3 z-20">
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${isDark ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
          AI GENERATED
        </span>
      </div>

      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>AI Analysis & Summary</h3>
          </div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-2.5 py-1 rounded-full mr-20">
            {summary.provider}
          </span>
        </div>

        {/* Metadata strip */}
        <div className={`mb-4 flex flex-wrap gap-2 rounded-lg p-3 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-1.5">
            <CalendarDays className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-[10px] font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {summary.period_days}d period
            </span>
          </div>

          <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>

          <div className="flex items-center gap-1.5">
            <TrendIcon className={`w-3.5 h-3.5 ${trend.color}`} />
            <span className={`text-[10px] font-semibold ${trend.color}`}>
              {trend.label}
            </span>
          </div>

          <span className={`text-[10px] ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>

          <div className="flex items-center gap-1.5">
            <AlertTriangle className={`w-3.5 h-3.5 ${summary.anomaly_count > 0 ? 'text-amber-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={`text-[10px] font-semibold ${summary.anomaly_count > 0 ? 'text-amber-400' : isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              {summary.anomaly_count} anomal{summary.anomaly_count === 1 ? 'y' : 'ies'}
            </span>
          </div>
        </div>

        <ul className="space-y-2">
          {summaryParagraphs.map((paragraph, index) => (
            <li key={`summary-line-${index}`} className={`text-sm leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
              <span className={`mr-2 ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}>•</span>
              {highlightKeywords(paragraph)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
