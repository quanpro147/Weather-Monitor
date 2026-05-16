import type { CSSProperties } from 'react';

type TooltipStyles = {
	contentStyle: CSSProperties;
	itemStyle: CSSProperties;
	labelStyle: CSSProperties;
	wrapperStyle: CSSProperties;
};

export function getTooltipStyles(isDark: boolean): TooltipStyles {
	return {
		contentStyle: {
			backgroundColor: isDark ? 'rgba(15, 17, 21, 0.78)' : 'rgba(255, 255, 255, 0.9)',
			border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(226,232,240,0.9)'}`,
			borderRadius: '12px',
			boxShadow: isDark ? '0 12px 30px rgba(0,0,0,0.35)' : '0 12px 30px rgba(15,23,42,0.15)',
			color: isDark ? '#e5e7eb' : '#0f172a',
			fontSize: '11px',
			backdropFilter: 'blur(12px)',
			WebkitBackdropFilter: 'blur(12px)',
		},
		itemStyle: {
			color: isDark ? '#e2e8f0' : '#0f172a',
			fontSize: '11px',
			fontWeight: 600,
		},
		labelStyle: {
			color: isDark ? '#94a3b8' : '#64748b',
			fontSize: '10px',
			fontWeight: 700,
			letterSpacing: '0.1em',
			textTransform: 'uppercase',
			marginBottom: '4px',
		},
		wrapperStyle: {
			outline: 'none',
		},
	};
}

export function getGlassTooltipClassName(isDark: boolean): string {
	return `rounded-xl border px-3 py-2 shadow-[0_12px_28px_rgba(0,0,0,0.28)] backdrop-blur-md ${
		isDark ? 'border-white/10 bg-[#0f1115]/80 text-gray-100' : 'border-gray-200/80 bg-white/80 text-gray-900'
	}`;
}
