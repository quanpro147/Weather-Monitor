import type { AnomalyRecord } from '@/types/api'

interface AnomalyTimelineProps {
  data: AnomalyRecord[]
  loading?: boolean
}

export function AnomalyTimeline({ data, loading }: AnomalyTimelineProps) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="w-6 h-6 rounded bg-slate-700 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data.length) {
    return <p className="text-slate-500 text-sm text-center py-4">Chọn thành phố và khoảng thời gian</p>
  }

  const anomalyCount = data.filter((d) => d.is_anomaly).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500/70 border border-red-400" />
            Bất thường ({anomalyCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-600 border border-slate-500" />
            Bình thường ({data.length - anomalyCount})
          </span>
        </div>
        <span className="text-xs text-slate-500">{data.length} ngày</span>
      </div>

      <div className="flex flex-wrap gap-1">
        {data.map((d) => {
          const scorePercent = Math.min(Math.abs(d.anomaly_score), 1)
          return (
            <div
              key={d.date}
              title={`${d.date}\nScore: ${d.anomaly_score.toFixed(4)}\n${d.is_anomaly ? '⚠️ Bất thường' : '✓ Bình thường'}\nNhiệt độ: ${d.temperature_2m_mean?.toFixed(1) ?? '—'}°C\nMưa: ${d.rain_sum?.toFixed(1) ?? '0'} mm`}
              className={`w-5 h-5 rounded-sm border cursor-default transition-transform hover:scale-110 ${
                d.is_anomaly
                  ? 'border-red-400/60 animate-none'
                  : 'border-slate-600/40'
              }`}
              style={{
                backgroundColor: d.is_anomaly
                  ? `rgba(239, 68, 68, ${0.3 + scorePercent * 0.6})`
                  : `rgba(71, 85, 105, ${0.2 + scorePercent * 0.2})`,
              }}
            />
          )
        })}
      </div>

      {anomalyCount > 0 && (
        <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
          {data
            .filter((d) => d.is_anomaly)
            .slice(0, 5)
            .map((d) => (
              <div
                key={d.date}
                className="flex items-center gap-2 text-xs bg-red-500/10 border border-red-500/20 rounded px-2 py-1"
              >
                <span className="text-red-400 font-mono font-medium w-24 flex-shrink-0">{d.date}</span>
                <span className="text-slate-400">
                  {d.temperature_2m_mean?.toFixed(1) ?? '—'}°C ·{' '}
                  {d.rain_sum?.toFixed(1) ?? '0'} mm mưa ·{' '}
                  Score: <span className="text-red-400">{d.anomaly_score.toFixed(4)}</span>
                </span>
              </div>
            ))}
          {anomalyCount > 5 && (
            <p className="text-xs text-slate-600 text-center">+{anomalyCount - 5} ngày khác</p>
          )}
        </div>
      )}
    </div>
  )
}
