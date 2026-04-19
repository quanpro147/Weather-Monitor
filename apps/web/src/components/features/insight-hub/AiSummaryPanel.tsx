"use client";

import useSWR from "swr";
import { Sparkles, AlertCircle } from "lucide-react";

// Hàm fetcher cơ bản để gọi API
const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AiSummaryPanelProps {
  cityId: number;
}

export default function AiSummaryPanel({ cityId }: AiSummaryPanelProps) {
  // Gọi API từ Backend FastAPI (port 8000)
  const { data, error, isLoading } = useSWR(
    cityId ? `http://localhost:8000/summary/${cityId}` : null,
    fetcher
  );

  // Hiệu ứng Loading Skeleton (Bộ xương chờ tải)
  if (isLoading) {
    return (
      <div className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
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
  if (error || !data?.success) {
    return (
      <div className="p-6 bg-red-50 border border-red-100 rounded-xl shadow-sm flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-800">Không thể tạo tóm tắt</h3>
          <p className="text-red-600 text-sm mt-1">Đã có lỗi xảy ra khi kết nối với AI.</p>
        </div>
      </div>
    );
  }

  const summary = data.data;

  // Giao diện chính thức khi có dữ liệu
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm relative overflow-hidden">
      {/* Hiệu ứng mờ ảo ở góc */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-800 text-lg">AI Phân Tích & Tóm Tắt</h3>
          </div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-100 px-2.5 py-1 rounded-full">
            {summary.provider}
          </span>
        </div>
        
        <p className="text-gray-700 leading-relaxed">
          {summary.summary_text}
        </p>
      </div>
    </div>
  );
}