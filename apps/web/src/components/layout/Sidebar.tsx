import Link from "next/link";
import { useRouter } from "next/router";

export default function Sidebar() {
    const router = useRouter();

    const menuItems = [
        { label: 'Overview Dashboard', icon: 'fa-chart-pie', path: '/', enabled: true },
        { label: 'Interactive Map', icon: 'fa-map-location-dot', path: '/map', enabled: true },
        { label: 'Data Analytics (EDA)', icon: 'fa-chart-line', path: '/analytics', enabled: false },
        { label: 'AI Insights & Alerts', icon: 'fa-bolt', path: '/insights', enabled: false },
        { label: 'Station Management', icon: 'fa-satellite-dish', path: '/stations', enabled: false },
        { label: 'System Settings', icon: 'fa-gear', path: '/settings', enabled: false },
    ];

    const isActive = (path: string) => router.pathname === path;

    return (
        <div className="w-[250px] bg-white dark:bg-[#16181c] border-r border-gray-200 dark:border-[#2a2d33] flex flex-col h-full shrink-0 transition-colors duration-300">
            {/* Project Info */}
            <div className="p-5 border-b border-gray-200 dark:border-[#2a2d33] flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-500/30 flex items-center justify-center text-lg shadow-sm">
                    <i className="fa-solid fa-cloud-sun"></i>
                </div>
                <div>
                    <div className="font-black text-gray-900 dark:text-[#f4f4f5] truncate text-sm tracking-tight">
                        Weather Monitor
                    </div>
                    <div className="text-[9px] text-gray-500 dark:text-[#8b949e] font-bold uppercase tracking-widest mt-0.5">
                        HCMUS Project
                    </div>
                </div>
            </div>

            {/* Menu */}
            <div className="px-4 pt-5 pb-2">
                <p className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 dark:text-[#6b7280]">Navigation</p>
            </div>
            <div className="flex-1 py-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
                {menuItems.map((item, index) => {
                    const baseClass = 'group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200';

                    if (item.enabled) {
                        return (
                            <Link
                                key={index}
                                href={item.path}
                                className={`${baseClass} ${
                                    isActive(item.path)
                                        ? 'font-bold bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/30 shadow-sm'
                                        : 'font-semibold text-gray-600 dark:text-[#9ca3af] border-transparent hover:bg-gray-50 dark:hover:bg-[#1a1d21] hover:text-gray-900 dark:hover:text-[#e5e7eb]'
                                }`}
                            >
                                <i className={`fa-solid ${item.icon} w-5 text-center text-sm transition-colors ${isActive(item.path) ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400 dark:text-[#6b7280] group-hover:text-gray-600 dark:group-hover:text-[#d1d5db]'}`}></i>
                                <span className="text-xs">{item.label}</span>
                            </Link>
                        );
                    }

                    return (
                        <button
                            key={index}
                            type="button"
                            disabled
                            title="Coming soon"
                            className={`${baseClass} w-full font-semibold text-gray-400 dark:text-[#6b7280] border-transparent opacity-70 cursor-not-allowed`}
                        >
                            <i className={`fa-solid ${item.icon} w-5 text-center text-sm`}></i>
                            <span className="text-xs">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-[#2a2d33]">
                <div className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-[#1a1d21] border border-gray-200 dark:border-[#2a2d33] rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-[#d1d5db] uppercase tracking-wider">System Online</span>
                    </div>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                        Stable
                    </span>
                </div>
            </div>
        </div>
    );
}