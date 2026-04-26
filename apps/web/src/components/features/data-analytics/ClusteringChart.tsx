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
import { useTheme } from '../../../contexts/ThemeContext';

interface ClusterPoint {
    city: string;
    temp: number;
    aqi: number;
    rain?: number;
    cluster: 0 | 1 | 2;
}

interface ClusterProfile {
    id: 0 | 1 | 2;
    name: string;
    color: string;
    colorLight: string;
    desc: string;
}

const mockClusterData: ClusterPoint[] = [
    { city: 'Hà Nội', temp: 16, aqi: 185, cluster: 0 },
    { city: 'Bắc Ninh', temp: 17, aqi: 170, cluster: 0 },
    { city: 'Thái Nguyên', temp: 15, aqi: 176, cluster: 0 },
    { city: 'Bắc Kinh', temp: 12, aqi: 210, cluster: 0 },
    { city: 'TP.HCM', temp: 34, aqi: 65, rain: 120, cluster: 1 },
    { city: 'Cần Thơ', temp: 33, aqi: 50, rain: 150, cluster: 1 },
    { city: 'Cà Mau', temp: 32, aqi: 58, rain: 165, cluster: 1 },
    { city: 'Ninh Thuận', temp: 38, aqi: 40, rain: 10, cluster: 2 },
    { city: 'Bình Thuận', temp: 37, aqi: 45, rain: 12, cluster: 2 },
    { city: 'Đà Nẵng', temp: 35, aqi: 80, rain: 20, cluster: 2 },
];

const clusterProfiles: ClusterProfile[] = [
    { id: 0, name: 'Cluster 0: Cold & High Pollution', color: '#ef4444', colorLight: '#fca5a5', desc: 'Cities sharing severe winter smog patterns.' },
    { id: 1, name: 'Cluster 1: Tropical Wet', color: '#3b82f6', colorLight: '#93c5fd', desc: 'High temperature and heavy precipitation.' },
    { id: 2, name: 'Cluster 2: Arid & Heatwave', color: '#f97316', colorLight: '#fdba74', desc: 'Extreme heat zones with minimal rainfall.' },
];

const clusterColorMap = new Map<number, string>(clusterProfiles.map((profile) => [profile.id, profile.color]));

export default function ClusteringChart() {
    const { isDark } = useTheme();
    const nearbyTempThreshold = 1.8;
    const nearbyAqiThreshold = 18;

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ClusterPoint }> }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            const profile = clusterProfiles.find((item) => item.id === data.cluster);

            if (!profile) {
                return null;
            }

            const nearbyStations = mockClusterData.filter(
                (item) =>
                    Math.abs(item.temp - data.temp) <= nearbyTempThreshold &&
                    Math.abs(item.aqi - data.aqi) <= nearbyAqiThreshold,
            );

            const denseCluster = nearbyStations.length > 1;
            const isPollutionCluster = data.cluster === 0;
            const denseTitle = isPollutionCluster
                ? `Vùng ô nhiễm (${nearbyStations.length} trạm)`
                : `Vùng tương đồng (${nearbyStations.length} trạm)`;

            return (
                <div
                    className={`rounded-xl border px-3 py-2 shadow-lg backdrop-blur-sm ${
                        isDark
                            ? 'border-white/10 bg-[#0f1115]/80 text-gray-100'
                            : 'border-gray-200/80 bg-white/80 text-gray-900'
                    }`}
                >
                    <p className="mb-1 text-sm font-black" style={{ color: profile.color }}>
                        {denseCluster ? denseTitle : data.city}
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
                            <span>Temp: {data.temp}°C</span>
                            <span>AQI: {data.aqi}</span>
                            <span className="col-span-2">Rain: {data.rain ?? 0} mm</span>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <section className={`rounded-xl border p-5 shadow-sm ${isDark ? 'border-[#2a2a2a] bg-[#151515]' : 'border-gray-200 bg-white'}`}>
            <div className="mb-5">
                <h3 className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-[#f3f4f6]' : 'text-gray-900'}`}>
                    Multivariate Clustering Analysis
                </h3>
                <p className={`mt-1 text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    K-Means similarity map in feature space (Temperature vs AQI)
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-10">
                <div className="xl:col-span-7">
                    <div className="h-[340px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
                                <defs>
                                    {clusterProfiles.map((profile) => (
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
                                <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', strokeOpacity: 0.2 }} />

                                <Scatter data={mockClusterData} name="K-Means clusters">
                                    {mockClusterData.map((point) => (
                                        <Cell
                                            key={`${point.city}-${point.cluster}`}
                                            fill={`url(#clusterGrad${point.cluster})`}
                                            fillOpacity={0.95}
                                            stroke={isDark ? '#0f172a' : '#ffffff'}
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
                        {clusterProfiles.map((profile) => (
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
                </aside>
            </div>
        </section>
    );
}