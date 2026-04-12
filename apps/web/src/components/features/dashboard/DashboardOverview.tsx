import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Dữ liệu Mock ban đầu (Sau này bạn sẽ thay bằng dữ liệu fetch từ WAQI/WeatherAPI)
const mockTrendData = [
    { time: '06:00', temp: 24, aqi: 45 },
    { time: '09:00', temp: 28, aqi: 55 },
    { time: '12:00', temp: 33, aqi: 80 },
    { time: '15:00', temp: 34, aqi: 110 },
    { time: '18:00', temp: 29, aqi: 75 },
    { time: '21:00', temp: 26, aqi: 50 },
];

export default function DashboardOverview() {
    const [chartFilter, setChartFilter] = useState('today');

    // Cấu trúc thẻ thống kê (Stats Cards)
    const stats = [
        { title: "Current Temp", value: "34°C", icon: "fa-temperature-half", color: "bg-orange-500", trend: "+2°C vs yesterday" },
        { title: "AQI Level", value: "110", icon: "fa-leaf", color: "bg-red-500", trend: "Unhealthy for Sensitive" },
        { title: "Humidity", value: "65%", icon: "fa-droplet", color: "bg-blue-500", trend: "Normal" },
        { title: "Wind Speed", value: "12 km/h", icon: "fa-wind", color: "bg-teal-500", trend: "Light Breeze" },
    ];

    return (
        <div className="w-full max-w-7xl mx-auto p-8">
            {/* Welcome Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-800">Vietnam Weather Overview</h2>
                <p className="text-gray-500 text-sm mt-1">Real-time meteorological metrics and analytics.</p>
            </div>

            {/* Stats Grid (Kế thừa thiết kế thẻ của Smart Restaurant) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition">
                        <div className={`w-14 h-14 rounded-xl ${stat.color} text-white flex items-center justify-center text-2xl shadow-sm`}>
                            <i className={`fa-solid ${stat.icon}`}></i>
                        </div>
                        <div>
                            <div className="text-gray-500 text-xs font-bold uppercase tracking-wide">{stat.title}</div>
                            <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                            <div className="text-xs font-medium text-gray-500 mt-1">{stat.trend}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Khu vực Biểu đồ EDA */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800">Temperature & AQI Trend</h3>
                        <select 
                            className="text-sm border-gray-300 border rounded-lg px-3 py-1.5 bg-gray-50 outline-none cursor-pointer"
                            value={chartFilter}
                            onChange={(e) => setChartFilter(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="week">Past 7 Days</option>
                        </select>
                    </div>
                    
                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorTemp)" />
                                <Line yAxisId="right" type="monotone" dataKey="aqi" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Insights / Active Alerts (Thay thế cho Top Selling) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800">Smart Insights</h3>
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <i className="fa-solid fa-robot"></i>
                        </div>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <i className="fa-solid fa-triangle-exclamation text-red-500 text-sm"></i>
                                <span className="font-bold text-red-700 text-sm">High UV Index Warning</span>
                            </div>
                            <p className="text-xs text-red-600 leading-relaxed">
                                UV Index is expected to reach 11 (Extreme) between 12:00 PM and 2:00 PM. Avoid direct sunlight.
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                            <div className="flex items-center gap-2 mb-1">
                                <i className="fa-solid fa-chart-pie text-gray-500 text-sm"></i>
                                <span className="font-bold text-gray-700 text-sm">Pattern Detected</span>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Average temperature has increased by 1.5°C over the last 3 days. Humidity is dropping, increasing dry weather risks.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}