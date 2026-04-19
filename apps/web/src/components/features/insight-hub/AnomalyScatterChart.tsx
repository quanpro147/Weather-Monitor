import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import { useTheme } from '../../../contexts/ThemeContext';
import type { ISODateString } from '../../../types/common';

export interface ScatterPoint {
    temp: number;
    humidity: number;
    is_anomaly: boolean;
    anomaly_score: number;
    date: ISODateString;
}

interface AnomalyScatterChartProps {
    data: ScatterPoint[];
}

export default function AnomalyScatterChart({ data }: AnomalyScatterChartProps) {
    const { isDark } = useTheme();

    const normalData = data.filter((item) => !item.is_anomaly);
    const anomalyData = data.filter((item) => item.is_anomaly);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload as ScatterPoint;
            return (
                <div className={`p-3 rounded-lg border shadow-lg ${isDark ? 'bg-[#151515] border-[#2a2d33]' : 'bg-white border-gray-200'}`}>
                    <p className={`font-black mb-1 ${data.is_anomaly ? 'text-red-500' : 'text-cyan-500'}`}>
                        {data.is_anomaly ? 'ANOMALY DETECTED' : 'NORMAL RECORD'}
                    </p>
                    <p className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Date: {data.date}</p>
                    <p className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Temp: {data.temp.toFixed(1)}C | Humidity: {data.humidity.toFixed(1)}%</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-2 ${isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-cyan-50 text-cyan-600 border border-cyan-200'}`}>
                        Anomaly Score: {data.anomaly_score.toFixed(3)}
                    </span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="relative h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} strokeOpacity={0.15} />
                    <XAxis type="number" dataKey="temp" name="Temperature" unit="°C" stroke={isDark ? "#9ca3af" : "#64748b"} tick={{fontSize: 10}} tickMargin={8} />
                    <YAxis type="number" dataKey="humidity" name="Humidity" unit="%" stroke={isDark ? "#9ca3af" : "#64748b"} tick={{fontSize: 10}} tickMargin={8} />
                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                    
                    {/* Vùng an toàn (Safe Zone) */}
                    <ReferenceArea x1={18} x2={34} y1={45} y2={75} fill={isDark ? "#10b981" : "#34d399"} fillOpacity={0.15} />
                    
                    {/* Vẽ điểm bình thường */}
                    <Scatter name="Normal" data={normalData} fill="#06b6d4" opacity={0.6} />
                    
                    {/* Vẽ điểm bất thường */}
                    <Scatter
                        name="Anomaly"
                        data={anomalyData}
                        fill="#ef4444"
                        opacity={0.95}
                        shape={(props: { cx?: number; cy?: number }) => (
                            <circle
                                cx={props.cx}
                                cy={props.cy}
                                r={7}
                                fill="#ef4444"
                                stroke="#ffffff"
                                strokeWidth={1.8}
                                style={{ filter: 'drop-shadow(0 0 6px rgba(239,68,68,0.7))' }}
                            />
                        )}
                    />
                </ScatterChart>
            </ResponsiveContainer>

            {data.length === 0 && (
                <div className={`absolute inset-0 flex items-center justify-center text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No weather points available for scatter rendering.
                </div>
            )}
        </div>
    );
}