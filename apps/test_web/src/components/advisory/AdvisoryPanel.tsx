import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import type { AdvisoryResponse } from '@/types/api'
import { RISK_COLORS } from '@/lib/colors'

interface AdvisoryPanelProps {
  advisory: AdvisoryResponse | null
  loading?: boolean
}

const RISK_ICONS = {
  low: CheckCircle,
  medium: Info,
  high: AlertTriangle,
}

const RISK_LABELS = {
  low: 'Rủi ro thấp',
  medium: 'Rủi ro trung bình',
  high: 'Rủi ro cao',
}

export function AdvisoryPanel({ advisory, loading }: AdvisoryPanelProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-32 bg-slate-700 rounded animate-pulse" />
        <div className="space-y-2">
          <div className="h-3 bg-slate-700 rounded animate-pulse" />
          <div className="h-3 bg-slate-700 rounded animate-pulse w-4/5" />
          <div className="h-3 bg-slate-700 rounded animate-pulse w-3/5" />
        </div>
      </div>
    )
  }

  if (!advisory) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Info size={16} />
        <span>Chọn thành phố để xem khuyến nghị</span>
      </div>
    )
  }

  const { bg, text, border, dot } = RISK_COLORS[advisory.risk_level]
  const Icon = RISK_ICONS[advisory.risk_level]

  return (
    <div className={`rounded-xl border p-4 ${bg} ${border}`}>
      <div className="flex items-center gap-2 mb-3">
        {advisory.risk_level === 'high' && (
          <span
            className="w-2.5 h-2.5 rounded-full pulse-dot flex-shrink-0"
            style={{ backgroundColor: dot }}
          />
        )}
        <Icon size={16} className={text} />
        <span className={`text-sm font-semibold ${text}`}>
          {RISK_LABELS[advisory.risk_level]}
        </span>
      </div>
      <p className="text-slate-300 text-sm leading-relaxed">{advisory.advice_text}</p>
    </div>
  )
}
