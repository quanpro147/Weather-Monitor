import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import { Thermometer, Droplets, Wind, Droplet, AlertCircle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { StatCard } from '@/components/weather/StatCard'
import { TempChart } from '@/components/weather/TempChart'
import { RainChart } from '@/components/weather/RainChart'
import { CityCompare } from '@/components/weather/CityCompare'
import { AnomalyTimeline } from '@/components/anomaly/AnomalyTimeline'
import { AdvisoryPanel } from '@/components/advisory/AdvisoryPanel'
import { getTempColor } from '@/lib/colors'
import {
  fetchCities,
  fetchCurrentWeather,
  fetchWeatherHistory,
  fetchAdvisory,
  fetchCityCompare,
  fetchAnomalies,
} from '@/lib/api'
import type {
  City,
  WeatherDaily,
  AdvisoryResponse,
  CityWeatherCompare,
  AnomalyRecord,
} from '@/types/api'

// Leaflet must be loaded client-side only
const VietnamMap = dynamic(() => import('@/components/map/VietnamMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 text-sm">
      Đang tải bản đồ...
    </div>
  ),
})

// Default date range: last 30 days
function defaultDates() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 30)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export default function Dashboard() {
  const { start: defaultStart, end: defaultEnd } = defaultDates()

  const [cities, setCities] = useState<City[]>([])
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null)
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)

  // Data states
  const [current, setCurrent] = useState<WeatherDaily | null>(null)
  const [history, setHistory] = useState<WeatherDaily[]>([])
  const [advisory, setAdvisory] = useState<AdvisoryResponse | null>(null)
  const [compare, setCompare] = useState<CityWeatherCompare[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyRecord[]>([])

  // Loading/error
  const [loadingCity, setLoadingCity] = useState(false)
  const [loadingCompare, setLoadingCompare] = useState(false)
  const [loadingAnomaly, setLoadingAnomaly] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load cities on mount
  useEffect(() => {
    fetchCities()
      .then((data) => {
        setCities(data)
        if (data.length > 0) setSelectedCityId(data[0].city_id)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Lỗi tải danh sách thành phố'))
  }, [])

  // Load compare data when cities list is ready
  useEffect(() => {
    if (cities.length === 0) return
    setLoadingCompare(true)
    const topCityIds = cities.slice(0, 10).map((c) => c.city_id)
    fetchCityCompare(topCityIds)
      .then(setCompare)
      .catch(() => setCompare([]))
      .finally(() => setLoadingCompare(false))
  }, [cities])

  // Load per-city data
  const loadCityData = useCallback(async (cityId: number, start: string, end: string) => {
    setLoadingCity(true)
    setLoadingAnomaly(true)
    setError(null)
    try {
      const [cur, hist, adv] = await Promise.all([
        fetchCurrentWeather(cityId),
        fetchWeatherHistory(cityId, start, end),
        fetchAdvisory(cityId),
      ])
      setCurrent(cur)
      setHistory(hist)
      setAdvisory(adv)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lỗi tải dữ liệu thời tiết')
    } finally {
      setLoadingCity(false)
    }

    fetchAnomalies(cityId, start, end)
      .then(setAnomalies)
      .catch(() => setAnomalies([]))
      .finally(() => setLoadingAnomaly(false))
  }, [])

  useEffect(() => {
    if (selectedCityId) {
      loadCityData(selectedCityId, startDate, endDate)
    }
  }, [selectedCityId, startDate, endDate, loadCityData])

  function handleRefresh() {
    if (selectedCityId) loadCityData(selectedCityId, startDate, endDate)
  }

  const selectedCity = cities.find((c) => c.city_id === selectedCityId)

  // Build map data: merge city list + compare data
  const mapCities = cities.map((c) => ({
    ...c,
    compare: compare.find((x) => x.city_id === c.city_id),
  }))

  // Stat values
  const tempColor = getTempColor(current?.temperature_2m_mean ?? null)

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Header
        cities={cities}
        selectedCityId={selectedCityId}
        onSelectCity={(id) => setSelectedCityId(id)}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onRefresh={handleRefresh}
        isLoading={loadingCity}
      />

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main grid */}
      <main className="flex-1 p-4 grid gap-4" style={{ gridTemplateColumns: '2fr 3fr', gridTemplateRows: 'auto auto auto' }}>

        {/* LEFT: Map (spans 2 rows) */}
        <div className="row-span-2 bg-slate-800 rounded-xl overflow-hidden border border-slate-700" style={{ minHeight: 420 }}>
          <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-slate-700">
            <h2 className="text-sm font-semibold text-slate-300">Bản đồ Việt Nam</h2>
            {selectedCity && (
              <span className="text-xs text-slate-500">
                {selectedCity.latitude.toFixed(2)}°N, {selectedCity.longitude.toFixed(2)}°E
              </span>
            )}
          </div>
          <div style={{ height: 'calc(100% - 45px)' }}>
            <VietnamMap
              cities={mapCities}
              selectedCityId={selectedCityId ?? undefined}
              onSelectCity={(id) => setSelectedCityId(id)}
            />
          </div>
        </div>

        {/* RIGHT TOP: Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Nhiệt độ TB"
            value={current?.temperature_2m_mean?.toFixed(1) ?? '—'}
            unit="°C"
            icon={Thermometer}
            color={tempColor}
            subLabel={`Max ${current?.temperature_2m_max?.toFixed(1) ?? '—'}° / Min ${current?.temperature_2m_min?.toFixed(1) ?? '—'}°`}
            loading={loadingCity}
          />
          <StatCard
            label="Lượng mưa"
            value={current?.rain_sum?.toFixed(1) ?? '0.0'}
            unit="mm"
            icon={Droplets}
            color="#38bdf8"
            subLabel="Tổng ngày"
            loading={loadingCity}
          />
          <StatCard
            label="Tốc độ gió"
            value={current?.wind_speed_10m_max?.toFixed(1) ?? '—'}
            unit="km/h"
            icon={Wind}
            color="#a78bfa"
            subLabel={`Trung bình ${current?.wind_speed_10m_mean?.toFixed(1) ?? '—'} km/h`}
            loading={loadingCity}
          />
          <StatCard
            label="Độ ẩm"
            value={current?.relative_humidity_2m_mean?.toFixed(0) ?? '—'}
            unit="%"
            icon={Droplet}
            color="#34d399"
            subLabel={`Max ${current?.relative_humidity_2m_max?.toFixed(0) ?? '—'}%`}
            loading={loadingCity}
          />
        </div>

        {/* RIGHT MIDDLE: Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Temp chart — wider */}
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Biểu đồ nhiệt độ ({history.length} ngày)
            </h3>
            <TempChart data={history} loading={loadingCity} />
          </div>

          {/* Rain chart */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Lượng mưa
            </h3>
            <RainChart data={history} loading={loadingCity} />
          </div>
        </div>

        {/* BOTTOM LEFT: Advisory */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Khuyến nghị thời tiết
          </h3>
          <AdvisoryPanel advisory={advisory} loading={loadingCity} />
        </div>

        {/* BOTTOM MIDDLE: City compare */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            So sánh các thành phố
          </h3>
          <CityCompare
            data={compare}
            loading={loadingCompare}
            selectedCityId={selectedCityId ?? undefined}
            onSelectCity={(id) => setSelectedCityId(id)}
          />
        </div>

        {/* BOTTOM RIGHT: Anomaly timeline */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 col-span-full lg:col-span-1">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Phát hiện bất thường — Isolation Forest
          </h3>
          <AnomalyTimeline data={anomalies} loading={loadingAnomaly} />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-600">
        <span>Weather Monitor · Dữ liệu từ Open-Meteo</span>
        <span className="font-mono">API: {process.env.NEXT_PUBLIC_API_URL ?? 'localhost:8000'}</span>
      </footer>
    </div>
  )
}
