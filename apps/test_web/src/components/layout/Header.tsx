import { RefreshCw, CloudSun, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { City } from '@/types/api'

interface HeaderProps {
  cities: City[]
  selectedCityId: number | null
  onSelectCity: (cityId: number) => void
  startDate: string
  endDate: string
  onStartDateChange: (v: string) => void
  onEndDateChange: (v: string) => void
  onRefresh: () => void
  isLoading: boolean
}

export function Header({
  cities,
  selectedCityId,
  onSelectCity,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  isLoading,
}: HeaderProps) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setClock(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'Asia/Ho_Chi_Minh',
        }) + ' ICT',
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="bg-slate-900 border-b border-slate-700/80 px-4 py-3 flex items-center gap-4 flex-wrap">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <CloudSun size={22} className="text-blue-400" />
        <span className="text-white font-bold text-base tracking-tight">
          Weather<span className="text-blue-400">Monitor</span>
        </span>
        <span className="hidden sm:flex items-center gap-1 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
          <span className="text-green-400 text-xs font-mono">LIVE</span>
        </span>
      </div>

      {/* City selector */}
      <select
        value={selectedCityId ?? ''}
        onChange={(e) => onSelectCity(Number(e.target.value))}
        className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
      >
        <option value="">— Chọn thành phố —</option>
        {cities.map((c) => (
          <option key={c.city_id} value={c.city_id}>
            {c.city}, {c.country}
          </option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>Từ</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
        <span>đến</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Refresh */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
      >
        <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        <span className="hidden sm:inline">Tải lại</span>
      </button>

      {/* Clock */}
      <div className="ml-auto flex items-center gap-1.5 text-slate-400 text-xs font-mono">
        <Clock size={12} />
        <span>{clock}</span>
      </div>
    </header>
  )
}
