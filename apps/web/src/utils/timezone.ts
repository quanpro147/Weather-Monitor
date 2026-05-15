const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
    'Viet Nam': 'Asia/Ho_Chi_Minh',
    'Vietnam': 'Asia/Ho_Chi_Minh',
    'Japan': 'Asia/Tokyo',
    'South Korea': 'Asia/Seoul',
    'Korea': 'Asia/Seoul',
    'China': 'Asia/Shanghai',
    'Thailand': 'Asia/Bangkok',
    'Singapore': 'Asia/Singapore',
    'Malaysia': 'Asia/Kuala_Lumpur',
    'Indonesia': 'Asia/Jakarta',
    'Philippines': 'Asia/Manila',
    'Myanmar': 'Asia/Rangoon',
    'Cambodia': 'Asia/Phnom_Penh',
    'Laos': 'Asia/Vientiane',
    'Bangladesh': 'Asia/Dhaka',
    'India': 'Asia/Kolkata',
    'Pakistan': 'Asia/Karachi',
    'Sri Lanka': 'Asia/Colombo',
    'Nepal': 'Asia/Kathmandu',
    'Mongolia': 'Asia/Ulaanbaatar',
    'Taiwan': 'Asia/Taipei',
    'Hong Kong': 'Asia/Hong_Kong',
    'Macau': 'Asia/Macau',
    'United States': 'America/New_York',
    'USA': 'America/New_York',
    'United Kingdom': 'Europe/London',
    'UK': 'Europe/London',
    'France': 'Europe/Paris',
    'Germany': 'Europe/Berlin',
    'Russia': 'Europe/Moscow',
    'Australia': 'Australia/Sydney',
    'New Zealand': 'Pacific/Auckland',
    'Brazil': 'America/Sao_Paulo',
    'Canada': 'America/Toronto',
    'Mexico': 'America/Mexico_City',
    'Argentina': 'America/Buenos_Aires',
    'South Africa': 'Africa/Johannesburg',
    'Egypt': 'Africa/Cairo',
    'Nigeria': 'Africa/Lagos',
    'Saudi Arabia': 'Asia/Riyadh',
    'UAE': 'Asia/Dubai',
    'United Arab Emirates': 'Asia/Dubai',
    'Turkey': 'Europe/Istanbul',
    'Iran': 'Asia/Tehran',
    'Iraq': 'Asia/Baghdad',
};

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function getTimezoneForCountry(country: string | null | undefined): string {
    if (!country) return DEFAULT_TIMEZONE;
    return COUNTRY_TIMEZONE_MAP[country] ?? DEFAULT_TIMEZONE;
}

export function formatTimeInTimezone(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    }).format(date);
}

export function getTimezoneAbbr(timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'short',
    }).formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value ?? timezone;
}

export function formatLastUpdatedDate(isoDate: string | null | undefined): string {
    if (!isoDate) return '--';
    const parts = isoDate.split('-');
    if (parts.length < 3) return isoDate;
    return `${parts[2]}/${parts[1]}`;
}
