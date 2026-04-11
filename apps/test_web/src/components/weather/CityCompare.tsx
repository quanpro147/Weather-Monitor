import type { CityWeatherCompare } from '@/types/api'
import { getTempColor, getTempLabel } from '@/lib/colors'
import { getWmoInfo } from '@/lib/wmo-codes'

interface CityCompareProps {
  data: CityWeatherCompare[]
  loading?: boolean
  onSelectCity?: (cityId: number) => void
  selectedCityId?: number
}

export function CityCompare({ data, loading, onSelectCity, selectedCityId }: CityCompareProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-700 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data.length) {
    return <p className="text-slate-500 text-sm text-center py-4">Không có dữ liệu so sánh</p>
  }

  const sorted = [...data].sort((a, b) =>
    (b.temperature_2m_mean ?? -99) - (a.temperature_2m_mean ?? -99),
  )

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-slate-500 border-b border-slate-700">
            <th className="text-left py-2 pr-3 font-medium">Thành phố</th>
            <th className="text-right py-2 px-2 font-medium">TB (°C)</th>
            <th className="text-right py-2 px-2 font-medium">Max</th>
            <th className="text-right py-2 px-2 font-medium">Mưa (mm)</th>
            <th className="text-right py-2 pl-2 font-medium">Thời tiết</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const tempColor = getTempColor(row.temperature_2m_mean)
            const wmo = getWmoInfo(row.weather_code)
            const isSelected = selectedCityId === row.city_id
            return (
              <tr
                key={row.city_id}
                onClick={() => onSelectCity?.(row.city_id)}
                className={`border-b border-slate-800 cursor-pointer transition-colors hover:bg-slate-700/50 ${
                  isSelected ? 'bg-slate-700/70' : ''
                }`}
              >
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    )}
                    <span className={isSelected ? 'text-white font-medium' : 'text-slate-300'}>
                      {row.city_name}
                    </span>
                  </div>
                </td>
                <td className="text-right py-2 px-2 font-mono font-bold" style={{ color: tempColor }}>
                  {row.temperature_2m_mean?.toFixed(1) ?? '—'}
                </td>
                <td className="text-right py-2 px-2 font-mono text-slate-400">
                  {row.temperature_2m_max?.toFixed(1) ?? '—'}
                </td>
                <td className="text-right py-2 px-2 font-mono text-cyan-400">
                  {row.rain_sum?.toFixed(1) ?? '0.0'}
                </td>
                <td className="text-right py-2 pl-2">
                  <span title={wmo.label}>{wmo.emoji}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="text-slate-600 text-xs mt-2 text-center">
        {getTempLabel(data[0]?.temperature_2m_mean)} → {getTempLabel(data[data.length - 1]?.temperature_2m_mean)}
      </p>
    </div>
  )
}
