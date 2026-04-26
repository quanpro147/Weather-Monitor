import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

const extremesMock = {
	hottest: { city: 'Nha Trang', temp: 39.2, date: '2026-04-15' },
	rainiest: { city: 'Hue', rain: 150.5, date: '2026-04-10' },
	worst_aqi: { city: 'Ha Noi', aqi: 195, date: '2026-04-12' },
};

const cards = [
	{
		key: 'hottest',
		label: 'National Hottest',
		city: extremesMock.hottest.city,
		value: `${extremesMock.hottest.temp.toFixed(1)}°C`,
		date: extremesMock.hottest.date,
		icon: 'fa-fire',
		valueClass: 'text-red-500',
		iconClass: 'text-red-500',
		accentClass: 'border-l-red-500',
	},
	{
		key: 'rainiest',
		label: 'Max Precipitation',
		city: extremesMock.rainiest.city,
		value: `${extremesMock.rainiest.rain.toFixed(1)} mm`,
		date: extremesMock.rainiest.date,
		icon: 'fa-cloud-showers-heavy',
		valueClass: 'text-blue-400',
		iconClass: 'text-blue-400',
		accentClass: 'border-l-blue-500',
	},
	{
		key: 'worst_aqi',
		label: 'Worst Air Quality',
		city: extremesMock.worst_aqi.city,
		value: `${extremesMock.worst_aqi.aqi}`,
		date: extremesMock.worst_aqi.date,
		icon: 'fa-smog',
		valueClass: 'text-purple-400',
		iconClass: 'text-purple-400',
		accentClass: 'border-l-purple-500',
	},
];

export default function ExtremesCards() {
	const { isDark } = useTheme();

	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-3">
			{cards.map((card) => (
				<article
					key={card.key}
					className={`rounded-xl border border-l-4 ${card.accentClass} p-4 shadow-sm ${
						isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'
					}`}
				>
					<div className="mb-3 flex items-start justify-between gap-3">
						<div>
							<p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{card.label}</p>
							<h3 className={`mt-1 text-lg font-black ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>{card.city}</h3>
						</div>
						<i className={`fa-solid ${card.icon} ${card.iconClass} text-lg`} aria-hidden="true"></i>
					</div>
					<p className={`text-2xl font-black leading-none ${card.valueClass}`}>{card.value}</p>
					<p className={`mt-2 text-[11px] font-semibold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Observed {card.date}</p>
				</article>
			))}
		</section>
	);
}

