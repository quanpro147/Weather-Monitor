// Temperature → Tailwind color class mappings

export function getTempColor(temp: number | null): string {
  if (temp === null) return '#94a3b8' // slate-400 neutral
  if (temp <= 15) return '#60a5fa'   // blue-400
  if (temp <= 20) return '#22d3ee'   // cyan-400
  if (temp <= 25) return '#4ade80'   // green-400
  if (temp <= 30) return '#facc15'   // yellow-400
  if (temp <= 35) return '#fb923c'   // orange-400
  return '#ef4444'                    // red-500
}

export function getTempLabel(temp: number | null): string {
  if (temp === null) return 'N/A'
  if (temp <= 15) return 'Lạnh'
  if (temp <= 20) return 'Mát'
  if (temp <= 25) return 'Dễ chịu'
  if (temp <= 30) return 'Ấm'
  if (temp <= 35) return 'Nóng'
  return 'Rất nóng'
}

export function getTempBgClass(temp: number | null): string {
  if (temp === null) return 'bg-slate-600'
  if (temp <= 15) return 'bg-blue-500/20 text-blue-300'
  if (temp <= 20) return 'bg-cyan-500/20 text-cyan-300'
  if (temp <= 25) return 'bg-green-500/20 text-green-300'
  if (temp <= 30) return 'bg-yellow-500/20 text-yellow-300'
  if (temp <= 35) return 'bg-orange-500/20 text-orange-300'
  return 'bg-red-500/20 text-red-300'
}

export const RISK_COLORS = {
  low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', dot: '#22c55e' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', dot: '#eab308' },
  high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', dot: '#ef4444' },
} as const
