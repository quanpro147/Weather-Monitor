import { useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import type { City, CityWeatherCompare } from '@/types/api'
import { getTempColor, getTempLabel } from '@/lib/colors'
import { getWmoInfo } from '@/lib/wmo-codes'

// Fix leaflet icon issue with Next.js (only needed in browser)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require('leaflet')
  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    iconUrl: '/leaflet/marker-icon.png',
    shadowUrl: '/leaflet/marker-shadow.png',
  })
}

interface CityMarkerData extends City {
  compare?: CityWeatherCompare
}

interface VietnamMapProps {
  cities: CityMarkerData[]
  selectedCityId?: number
  onSelectCity?: (cityId: number) => void
}

// Recenter map helper
function MapController({ selectedCityId, cities }: { selectedCityId?: number; cities: CityMarkerData[] }) {
  const map = useMap()
  useEffect(() => {
    if (!selectedCityId) return
    const city = cities.find((c) => c.city_id === selectedCityId)
    if (city) {
      map.flyTo([city.latitude, city.longitude], 8, { duration: 1.2 })
    }
  }, [selectedCityId, cities, map])
  return null
}

export default function VietnamMap({ cities, selectedCityId, onSelectCity }: VietnamMapProps) {
  // Vietnam center
  const center: [number, number] = [16.5, 107.5]

  return (
    <MapContainer
      center={center}
      zoom={5}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      <MapController selectedCityId={selectedCityId} cities={cities} />

      {cities.map((city) => {
        const temp = city.compare?.temperature_2m_mean ?? null
        const color = getTempColor(temp)
        const isSelected = city.city_id === selectedCityId
        const wmo = getWmoInfo(city.compare?.weather_code ?? null)

        return (
          <CircleMarker
            key={city.city_id}
            center={[city.latitude, city.longitude]}
            radius={isSelected ? 12 : 8}
            pathOptions={{
              fillColor: color,
              fillOpacity: isSelected ? 0.9 : 0.7,
              color: isSelected ? '#fff' : color,
              weight: isSelected ? 2 : 1,
            }}
            eventHandlers={{
              click: () => onSelectCity?.(city.city_id),
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'sans-serif', minWidth: 160, fontSize: 13 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                  {wmo.emoji} {city.city}
                </div>
                {city.compare ? (
                  <table style={{ borderSpacing: '4px 2px', borderCollapse: 'separate' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: '#6b7280' }}>Nhiệt độ TB</td>
                        <td style={{ fontWeight: 600, color }}>
                          {city.compare.temperature_2m_mean?.toFixed(1) ?? '—'}°C
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: '#6b7280' }}>Cao nhất</td>
                        <td style={{ fontWeight: 600 }}>
                          {city.compare.temperature_2m_max?.toFixed(1) ?? '—'}°C
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: '#6b7280' }}>Lượng mưa</td>
                        <td style={{ fontWeight: 600, color: '#38bdf8' }}>
                          {city.compare.rain_sum?.toFixed(1) ?? '0'} mm
                        </td>
                      </tr>
                      <tr>
                        <td style={{ color: '#6b7280' }}>Tình trạng</td>
                        <td>{getTempLabel(temp)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: 12 }}>Đang tải dữ liệu...</p>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
