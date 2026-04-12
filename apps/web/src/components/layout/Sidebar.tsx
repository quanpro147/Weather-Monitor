import { Link, useRouter } from "next/router"; // Đổi sang router của Next.js
import { useState } from "react";

export default function Sidebar() {
    const router = useRouter();
    const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);

    // Menu cho Weather Admin
    const menuItems = [
        { label: 'Overview Dashboard', icon: 'fa-chart-pie', path: '/weather' },
        { label: 'Interactive Map', icon: 'fa-map-location-dot', path: '/weather/map' },
        { label: 'Data Analytics (EDA)', icon: 'fa-chart-line', path: '/weather/analytics' },
        { label: 'AI Insights & Alerts', icon: 'fa-bolt', path: '/weather/insights' },
        { label: 'Station Management', icon: 'fa-satellite-dish', path: '/weather/stations' },
        { label: 'System Settings', icon: 'fa-gear', path: '/weather/settings' },
    ];

    const isActive = (path: string) => router.pathname === path;

    return (
        <div 
            className="w-[260px] bg-white border-r border-gray-200 flex flex-col h-full shrink-0 font-sans shadow-sm"
            onClick={() => setShowAvatarDropdown(false)}
        >
            {/* Project Info Snippet */}
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                    <i className="fa-solid fa-cloud-sun"></i>
                </div>
                <div className="relative">
                    <div className="font-bold text-gray-800 truncate text-sm">
                        Weather Monitor
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                        HCMUS Project
                    </div>
                </div>
            </div>

            {/* Menu */}
            <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto no-scrollbar">
                {menuItems.map((item, index) => (
                    <Link 
                        key={index}
                        href={item.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive(item.path) 
                            ? 'font-bold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm' 
                            : 'font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                    >
                        <i className={`fa-solid ${item.icon} w-6 text-center ${isActive(item.path) ? 'text-blue-600' : 'text-gray-400'}`}></i>
                        {item.label}
                    </Link>
                ))}
            </div>

            {/* Footer Sidebar */}
            <div className="p-4 border-t border-gray-200">
                <div className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-bold text-gray-700">System Online</span>
                </div>
            </div>
        </div>
    );
}