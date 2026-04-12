import Link from "next/link";
import { useRouter } from "next/router";

export default function Sidebar() {
    const router = useRouter();

    const menuItems = [
        { label: 'Overview Dashboard', icon: 'fa-chart-pie', path: '/' },
        { label: 'Interactive Map', icon: 'fa-map-location-dot', path: '/map' },
        { label: 'Data Analytics (EDA)', icon: 'fa-chart-line', path: '/analytics' },
        { label: 'AI Insights & Alerts', icon: 'fa-bolt', path: '/insights' },
        { label: 'Station Management', icon: 'fa-satellite-dish', path: '/stations' },
        { label: 'System Settings', icon: 'fa-gear', path: '/settings' },
    ];

    const isActive = (path: string) => router.pathname === path;

    return (
        <div className="w-[260px] bg-white dark:bg-[#16181c] border-r border-gray-200 dark:border-[#2a2d33] flex flex-col h-full shrink-0 transition-colors duration-300">
            {/* Project Info */}
            <div className="p-6 border-b border-gray-200 dark:border-[#252830] flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-400/30 flex items-center justify-center text-xl">
                    <i className="fa-solid fa-cloud-sun"></i>
                </div>
                <div>
                    <div className="font-bold text-gray-900 dark:text-[#f4f4f5] truncate text-sm tracking-wide">
                        Weather Monitor
                    </div>
                    <div className="text-xs text-gray-500 dark:text-[#9ca3af] font-medium mt-0.5">
                        HCMUS Project
                    </div>
                </div>
            </div>

            {/* Menu */}
            <div className="px-4 pt-5 pb-2">
                <p className="px-2 text-[11px] uppercase tracking-[0.16em] text-gray-400 dark:text-[#6b7280]">Navigation</p>
            </div>
            <div className="flex-1 py-2 px-3 space-y-1 overflow-y-auto no-scrollbar">
                {menuItems.map((item, index) => (
                    <Link 
                        key={index}
                        href={item.path}
                        className={`group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 ${
                            isActive(item.path) 
                            ? 'font-semibold bg-cyan-50 dark:bg-cyan-500/12 text-cyan-700 dark:text-cyan-200 border-cyan-200 dark:border-cyan-400/40 shadow-sm' 
                            : 'font-medium text-gray-600 dark:text-[#b5bcc8] border-transparent hover:bg-gray-50 dark:hover:bg-[#1f232a] hover:text-gray-900 dark:hover:text-[#f3f4f6]'
                        }`}
                    >
                        <i className={`fa-solid ${item.icon} w-5 text-center ${isActive(item.path) ? 'text-cyan-600 dark:text-cyan-300' : 'text-gray-400 dark:text-[#7c8799] group-hover:text-gray-600 dark:group-hover:text-[#d1d5db]'}`}></i>
                        {item.label}
                    </Link>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-[#252830]">
                <div className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-[#101215] border border-gray-200 dark:border-[#2a2d33] rounded-xl transition-colors">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></div>
                        <span className="text-sm font-semibold text-gray-700 dark:text-[#d1d5db]">System Online</span>
                    </div>
                </div>
            </div>
        </div>
    );
}