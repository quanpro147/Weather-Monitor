// WMO Weather Interpretation Codes → emoji + label

interface WmoInfo {
  emoji: string
  label: string
}

const WMO_MAP: Record<number, WmoInfo> = {
  0:  { emoji: '☀️',  label: 'Trời quang' },
  1:  { emoji: '🌤️', label: 'Ít mây' },
  2:  { emoji: '⛅',  label: 'Mây rải rác' },
  3:  { emoji: '☁️',  label: 'Nhiều mây' },
  45: { emoji: '🌫️', label: 'Sương mù' },
  48: { emoji: '🌫️', label: 'Sương mù dày' },
  51: { emoji: '🌦️', label: 'Mưa phùn nhẹ' },
  53: { emoji: '🌦️', label: 'Mưa phùn vừa' },
  55: { emoji: '🌧️', label: 'Mưa phùn nặng' },
  61: { emoji: '🌧️', label: 'Mưa nhỏ' },
  63: { emoji: '🌧️', label: 'Mưa vừa' },
  65: { emoji: '🌧️', label: 'Mưa lớn' },
  71: { emoji: '🌨️', label: 'Tuyết nhẹ' },
  73: { emoji: '🌨️', label: 'Tuyết vừa' },
  75: { emoji: '❄️',  label: 'Tuyết nặng' },
  80: { emoji: '🌦️', label: 'Mưa rào nhẹ' },
  81: { emoji: '🌧️', label: 'Mưa rào vừa' },
  82: { emoji: '⛈️', label: 'Mưa rào mạnh' },
  95: { emoji: '⛈️', label: 'Giông bão' },
  96: { emoji: '⛈️', label: 'Giông kèm mưa đá' },
  99: { emoji: '⛈️', label: 'Giông mưa đá lớn' },
}

export function getWmoInfo(code: number | null): WmoInfo {
  if (code === null) return { emoji: '❓', label: 'Không rõ' }
  return WMO_MAP[code] ?? { emoji: '🌡️', label: `Code ${code}` }
}
