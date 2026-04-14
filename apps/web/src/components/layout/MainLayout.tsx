import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-[#121212] overflow-hidden transition-colors duration-300 font-sans">
            <Sidebar />
            <div className="flex flex-col flex-1 w-full min-w-0">
                <Topbar />
                <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 xl:p-8 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}