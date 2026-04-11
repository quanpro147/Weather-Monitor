import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import type { WeatherDaily } from '@/types/api'
import { getTempColor } from '@/lib/colors'

interface TempChartProps {
  data: WeatherDaily[]
  loading?: boolean
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: <strong>{p.value?.toFixed(1)}°C</strong>
        </p>
      ))}
    </div>
  )
}

export function TempChart({ data, loading }: TempChartProps) {
  if (loading) {
    return (
      <div className="h-48 bg-slate-700/40 rounded-lg animate-pulse" />
    )
  }
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
        Không có dữ liệu
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5),   // MM-DD
    max: d.temperature_2m_max,
    mean: d.temperature_2m_mean,
    min: d.temperature_2m_min,
  }))

  const avgTemp = data.reduce((s, d) => s + (d.temperature_2m_mean ?? 0), 0) / data.length

  return (
    <ResponsiveContainer width="100%" height={192}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          tickFormatter={(v) => `${v}°`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={avgTemp}
          stroke="#475569"
          strokeDasharray="4 4"
          label={{ value: `TB ${avgTemp.toFixed(1)}°`, fill: '#64748b', fontSize: 10 }}
        />
        <Line
          type="monotone"
          dataKey="max"
          name="Cao nhất"
          stroke="#f97316"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: '#f97316' }}
        />
        <Line
          type="monotone"
          dataKey="mean"
          name="Trung bình"
          stroke={getTempColor(avgTemp)}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: getTempColor(avgTemp) }}
        />
        <Line
          type="monotone"
          dataKey="min"
          name="Thấp nhất"
          stroke="#60a5fa"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: '#60a5fa' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
