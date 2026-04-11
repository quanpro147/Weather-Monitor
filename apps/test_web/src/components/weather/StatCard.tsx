import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  unit?: string
  icon: LucideIcon
  color: string        // hex color
  subLabel?: string
  loading?: boolean
}

export function StatCard({ label, value, unit, icon: Icon, color, subLabel, loading }: StatCardProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 mt-1">
          <div className="h-7 w-24 bg-slate-700 rounded animate-pulse" />
          <div className="h-3 w-16 bg-slate-700 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className="flex items-end gap-1">
            <span
              className="text-2xl font-bold font-mono tabular-nums leading-none"
              style={{ color }}
            >
              {value}
            </span>
            {unit && <span className="text-slate-400 text-sm mb-0.5">{unit}</span>}
          </div>
          {subLabel && (
            <span className="text-xs text-slate-500">{subLabel}</span>
          )}
        </>
      )}
    </div>
  )
}
