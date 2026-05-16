import React from 'react';
import {
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
} from 'recharts';
import useSWR from 'swr';
import { useTheme } from '../../../contexts/ThemeContext';
import { useGlobalFilter } from '../../../hooks/useGlobalFilter';
import { getClustering } from '../../../services/analytics.service';
import type { ClusterPoint, ClusterProfile } from '../../../types/analytics';
import ChartSkeleton from '../../common/ChartSkeleton';
import EmptyState from '../../common/EmptyState';
import { getGlassTooltipClassName, getTooltipStyles } from '../../../utils/chartStyles';

const DEFAULT_K = 3;

export default function ClusteringChart() {
    const { isDark } = useTheme();
    const { scopeMode } = useGlobalFilter();
    const [k, setK] = React.useState(DEFAULT_K);
    const tooltipStyles = getTooltipStyles(isDark);

    const { data, isLoading, error } = useSWR(
        ['analytics:clustering', scopeMode, k],
        () => getClustering(scopeMode, k),
    );

    const points: ClusterPoint[] = data?.points ?? [];
    const profiles: ClusterProfile[] = data?.profiles ?? [];
    const clusterColorMap = new Map<number, string>(profiles.map((p) => [p.id, p.color]));

    const nearbyTempThreshold = 1.8;
    const nearbyAqiThreshold = 18;

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ClusterPoint }> }) => {
        if (active && payload && payload.length) {
            const pt = payload[0].payload;
            const profile = profiles.find((p) => p.id === pt.cluster);
            if (!profile) return null;

            const nearbyStations = points.filter(
                (item) =>
                    Math.abs(item.temp - pt.temp) <= nearbyTempThreshold &&
                    Math.abs(item.aqi - pt.aqi) <= nearbyAqiThreshold,
            );
            const denseCluster = nearbyStations.length > 1;
            const isPollutionCluster = pt.cluster === 0;
            const denseTitle = isPollutionCluster
                ? `Vùng ô nhiễm (${nearbyStations.length} trạm)`
                : `Vùng tương đồng (${nearbyStations.length} trạm)`;

            return (
                <div className={getGlassTooltipClassName(isDark)}>
                    <p className="mb-1 text-sm font-black" style={{ color: profile.color }}>
                        {denseCluster ? denseTitle : pt.city}
                    </p>
                    <p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {profile.name}
                    </p>

                    {denseCluster ? (
                        <div className="text-xs font-semibold">
                            <p className="mb-1">Các trạm gần nhau:</p>
                            <p className={`leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                {nearbyStations.map((item) => item.city).join(', ')}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-semibold">
                            <span>Temp: {pt.temp}°C</span>
                            <span>AQI: {pt.aqi}</span>
                            <span className="col-span-2">Rain: {pt.rain ?? 0} mm</span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <section className={`rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>
                        Multivariate Clustering Analysis
                    </h3>
                    <p className={`mt-1 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                        K-Means similarity map in feature space (Temperature vs AQI)
                    </p>
                </div>

                <div className={`flex items-center gap-1 rounded-lg border p-1 ${isDark ? 'border-[#2a2a2a] bg-[#101215]' : 'border-gray-200 bg-gray-50'}`}>
                    {([2, 3, 4, 5] as const).map((val) => (
                        <button
                            key={val}
                            type="button"
                            onClick={() => setK(val)}
                            className={`rounded-md px-3 py-1.5 text-[10px] font-bold transition-colors ${
                                k === val
                                    ? 'bg-cyan-600 text-white'
                                    : isDark
                                        ? 'text-gray-400 hover:text-gray-200'
                                        : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            k={val}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading && (
                <ChartSkeleton className="h-[340px]" />
            )}

            {(error || (!isLoading && points.length === 0)) && (
                <EmptyState message="No data available" className="h-[340px]" />
            )}

            {!isLoading && !error && points.length > 0 && (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-10">
                    <div className="xl:col-span-7">
                        <div className="h-[340px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
                                    <defs>
                                        {profiles.map((profile) => (
                                            <radialGradient
                                                key={`cluster-grad-${profile.id}`}
                                                id={`clusterGrad${profile.id}`}
                                                cx="35%"
                                                cy="30%"
                                                r="70%"
                                            >
                                                <stop offset="0%" stopColor={profile.colorLight} stopOpacity={0.98} />
                                                <stop offset="65%" stopColor={profile.color} stopOpacity={0.93} />
                                                <stop offset="100%" stopColor={profile.color} stopOpacity={0.78} />
                                            </radialGradient>
                                        ))}
                                    </defs>

                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#cbd5e1'} strokeOpacity={0.15} />
                                    <XAxis
                                        type="number"
                                        dataKey="temp"
                                        name="Temperature"
                                        unit="°C"
                                        tick={{ fill: isDark ? '#fdba74' : '#c2410c', fontSize: 11, fontWeight: 800 }}
                                        axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        type="number"
                                        dataKey="aqi"
                                        name="AQI"
                                        tick={{ fill: isDark ? '#67e8f9' : '#0e7490', fontSize: 11, fontWeight: 800 }}
                                        axisLine={{ stroke: isDark ? '#334155' : '#cbd5e1' }}
                                        tickLine={false}
                                    />
                                    <ZAxis type="number" dataKey="aqi" range={[80, 260]} />
                                    <Tooltip
                                        content={<CustomTooltip />}
                                        cursor={{ strokeDasharray: '3 3', strokeOpacity: 0.2 }}
                                        wrapperStyle={tooltipStyles.wrapperStyle}
                                    />

                                    <Scatter data={points} name="K-Means clusters">
                                        {points.map((point) => (
                                            <Cell
                                                key={`${point.city}-${point.cluster}`}
                                                fill={`url(#clusterGrad${point.cluster})`}
                                                fillOpacity={0.95}
                                                stroke={clusterColorMap.get(point.cluster) ?? '#888'}
                                                strokeWidth={1}
                                            />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <aside className={`xl:col-span-3 rounded-xl border p-4 ${isDark ? 'border-[#2a2a2a] bg-[#101215]' : 'border-gray-200 bg-gray-50'}`}>
                        <p className={`border-b pb-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-500'}`}>
                            xAI Cluster Profiling
                        </p>

                        <div className="mt-3 space-y-3">
                            {profiles.map((profile) => (
                                <article key={profile.id} className={`rounded-lg border p-3 ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
                                    <div className="flex items-start gap-2">
                                        <span
                                            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{
                                                background: `radial-gradient(circle at 30% 30%, ${profile.colorLight} 0%, ${profile.color} 65%, ${profile.color} 100%)`,
                                            }}
                                        ></span>
                                        <div>
                                            <p className={`text-xs font-black ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>{profile.name}</p>
                                            <p className={`mt-1 text-[10px] leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{profile.desc}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>

                        {data?.meta && (
                            <p className={`mt-3 text-[9px] ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                {data.meta.rows_after_dropna}/{data.meta.source_rows} cities · {data.meta.algorithm} · {data.meta.scaler}
                            </p>
                        )}
                    </aside>
                </div>
            )}
        </section>
    );
}
