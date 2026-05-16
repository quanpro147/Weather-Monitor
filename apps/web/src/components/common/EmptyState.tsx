import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

type EmptyStateProps = {
	message: string;
	className?: string;
};

export default function EmptyState({ message, className = '' }: EmptyStateProps) {
	const { isDark } = useTheme();

	return (
		<div
			className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border px-4 text-center ${
				isDark
					? 'border-white/10 bg-[#0f1115]/75 text-gray-200'
					: 'border-gray-200/80 bg-white/80 text-gray-700'
			} ${className}`}
		>
			<div
				className={`flex h-10 w-10 items-center justify-center rounded-full border ${
					isDark ? 'border-white/10 bg-white/5 text-cyan-200' : 'border-gray-200 bg-gray-50 text-cyan-600'
				}`}
			>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.6"
					strokeLinecap="round"
					strokeLinejoin="round"
					aria-hidden="true"
				>
					<path d="M7 18a4 4 0 0 1 0-8 6 6 0 1 1 10.7 3.7" />
					<path d="M15 18l6-6" />
					<path d="M21 18l-6-6" />
				</svg>
			</div>
			<p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{message}</p>
		</div>
	);
}
