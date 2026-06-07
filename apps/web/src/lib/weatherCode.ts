/**
 * WMO Weather Code → WeatherCategory mapper
 * Reference: https://open-meteo.com/en/docs — WMO Weather interpretation codes (WW)
 */

export type WeatherCategoryKey =
    | 'Clear'
    | 'Cloudy'
    | 'Foggy'
    | 'Drizzle'
    | 'Rain'
    | 'Snow'
    | 'Showers'
    | 'Thunderstorm'
    | 'Unknown';

export interface WeatherCategory {
    key: WeatherCategoryKey;
    label: string;
    icon: string;           // Font Awesome class, e.g. "fa-sun"
    colorClass: string;     // Tailwind text colour class
    bgClass: string;        // Tailwind bg colour class (light-tinted)
}

const CATEGORIES: Record<WeatherCategoryKey, Omit<WeatherCategory, 'key'>> = {
    Clear:        { label: 'Trời Quang Đãng (Clear)',        icon: 'fa-sun',                colorClass: 'text-amber-500',   bgClass: 'bg-amber-50  dark:bg-amber-500/10'   },
    Cloudy:       { label: 'Nhiều Mây (Cloudy)',       icon: 'fa-cloud',              colorClass: 'text-gray-400',    bgClass: 'bg-gray-100  dark:bg-gray-500/10'    },
    Foggy:        { label: 'Có Sương Mù (Foggy)',        icon: 'fa-smog',               colorClass: 'text-gray-500',    bgClass: 'bg-gray-100  dark:bg-gray-500/10'    },
    Drizzle:      { label: 'Mưa Phùn (Drizzle)',      icon: 'fa-cloud-drizzle',      colorClass: 'text-sky-400',     bgClass: 'bg-sky-50    dark:bg-sky-500/10'     },
    Rain:         { label: 'Mưa Thường (Rain)',         icon: 'fa-cloud-rain',         colorClass: 'text-blue-500',    bgClass: 'bg-blue-50   dark:bg-blue-500/10'    },
    Snow:         { label: 'Có Tuyết (Snow)',          icon: 'fa-snowflake',          colorClass: 'text-cyan-400',    bgClass: 'bg-cyan-50   dark:bg-cyan-500/10'    },
    Showers:      { label: 'Mưa Rào Lớn (Showers)',      icon: 'fa-cloud-showers-heavy',colorClass: 'text-indigo-500',  bgClass: 'bg-indigo-50 dark:bg-indigo-500/10'  },
    Thunderstorm: { label: 'Mưa Giông Sét (Thunderstorm)', icon: 'fa-bolt',               colorClass: 'text-yellow-500',  bgClass: 'bg-yellow-50 dark:bg-yellow-500/10'  },
    Unknown:      { label: 'Chưa Xác Định (Unknown)',      icon: 'fa-circle-question',    colorClass: 'text-gray-400',    bgClass: 'bg-gray-50   dark:bg-gray-500/5'     },
};

/** Map a WMO weather code to a WeatherCategory. Null/undefined → Unknown. */
export function classifyWeatherCode(code: number | null | undefined): WeatherCategory {
    const key = resolveKey(code);
    return { key, ...CATEGORIES[key] };
}

function resolveKey(code: number | null | undefined): WeatherCategoryKey {
    if (code === null || code === undefined) return 'Unknown';

    // WMO code ranges — see Open-Meteo WMO table
    if (code === 0)                    return 'Clear';           // Clear sky
    if (code >= 1 && code <= 3)        return 'Cloudy';          // Partly/mostly cloudy, overcast
    if (code >= 45 && code <= 48)      return 'Foggy';           // Fog, depositing rime fog
    if (code >= 51 && code <= 57)      return 'Drizzle';         // Drizzle (light / moderate / dense, freezing)
    if (code >= 61 && code <= 67)      return 'Rain';            // Rain (slight / moderate / heavy, freezing)
    if (code >= 71 && code <= 77)      return 'Snow';            // Snowfall / snow grains / ice crystals
    if (code >= 80 && code <= 82)      return 'Showers';         // Rain showers (slight / moderate / violent)
    if (code >= 85 && code <= 86)      return 'Snow';            // Snow showers
    if (code >= 95 && code <= 99)      return 'Thunderstorm';    // Thunderstorm ± hail
    return 'Unknown';
}

/** Return ALL category keys in display order (for consistent rendering). */
export const WEATHER_CATEGORY_ORDER: WeatherCategoryKey[] = [
    'Clear', 'Cloudy', 'Foggy', 'Drizzle', 'Rain', 'Showers', 'Thunderstorm', 'Snow', 'Unknown',
];