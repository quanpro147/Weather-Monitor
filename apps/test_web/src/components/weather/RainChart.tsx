import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { WeatherDaily } from '@/types/api'

interface RainChartProps {
  data: WeatherDaily[]
  loading?: boolean
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-cyan-400 font-mono">Lượng mưa: <strong>{payload[0]?.value?.toFixed(1)} mm</strong></p>
    </div>
  )
}

export function RainChart({ data, loading }: RainChartProps) {
  if (loading) return <div className="h-36 bg-slate-700/40 rounded-lg animate-pulse" />
  if (!data.length) {
    return <div className="h-36 flex items-center justify-center text-slate-500 text-sm">Không có dữ liệu</div>
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    rain: d.rain_sum ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={144}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} tickFormatter={(v) => `${v}mm`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155' }} />
        <Bar dataKey="rain" name="Lượng mưa" radius={[2, 2, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.rain > 10 ? '#38bdf8' : entry.rain > 0 ? '#7dd3fc' : '#334155'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
