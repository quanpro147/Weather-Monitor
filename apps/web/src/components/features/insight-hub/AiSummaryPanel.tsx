"use client";

import useSWR from "swr";
import { Sparkles, AlertCircle } from "lucide-react";
import { getWeatherSummary } from '../../../services/summary.service';
import { useTheme } from '../../../contexts/ThemeContext';

interface AiSummaryPanelProps {
  cityId: number | null;
}

export default function AiSummaryPanel({ cityId }: AiSummaryPanelProps) {
  const { isDark } = useTheme();

  const { data: summary, error, isLoading } = useSWR(
    cityId !== null ? `summary:${cityId}` : null,
    () => getWeatherSummary(cityId as number)
  );

  const highlightKeywords = (text: string) => {
    const pattern = /(nguy co|canh bao|bat thuong|mua lon|nang nong|ngap ung|gio giat|suong mu|hazardous|unhealthy)/gi;
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
          <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>AI Phan Tich va Tom Tat</h3>
        </div>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Vui long chon thanh pho de xem tom tat AI.</p>
      </div>
    );
  }

  // Hiệu ứng Loading Skeleton (Bộ xương chờ tải)
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

  // Xử lý Lỗi
  if (error || !summary) {
    return (
      <div className={`p-6 rounded-xl shadow-sm flex items-start gap-3 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
        <div>
          <h3 className={`font-semibold ${isDark ? 'text-red-300' : 'text-red-800'}`}>Khong the tao tom tat</h3>
          <p className={`text-sm mt-1 ${isDark ? 'text-red-200/80' : 'text-red-600'}`}>Da co loi xay ra khi ket noi voi AI.</p>
        </div>
      </div>
    );
  }

  // Giao diện chính thức khi có dữ liệu
  return (
    <div className={`p-6 rounded-xl shadow-sm relative overflow-hidden border ${isDark ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20' : 'bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20'}`}>
      <div className="absolute top-3 right-3 z-20">
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${isDark ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-100 text-cyan-700 border border-cyan-200'}`}>
          AI GENERATED
        </span>
      </div>

      {/* Hiệu ứng mờ ảo ở góc */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-40"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-800'}`}>AI Phan Tich va Tom Tat</h3>
          </div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-2.5 py-1 rounded-full mr-20">
            {summary.provider}
          </span>
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