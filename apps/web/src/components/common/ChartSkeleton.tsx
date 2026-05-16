import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

type ChartSkeletonProps = {
	className?: string;
};

export default function ChartSkeleton({ className = '' }: ChartSkeletonProps) {
	const { isDark } = useTheme();

	return (
		<div
			className={`relative overflow-hidden rounded-xl border ${
				isDark ? 'border-[#2a2a2a] bg-[#101215]' : 'border-gray-200 bg-gray-50'
			} ${className}`}
		>
			<div
				className={`absolute inset-0 animate-pulse bg-gradient-to-br ${
					isDark ? 'from-[#0f1115] via-[#141a23] to-[#0f1115]' : 'from-white via-gray-50 to-white'
				}`}
			/>
			<div className="relative h-full w-full" />
		</div>
	);
}
