import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-[#121212] overflow-hidden transition-colors duration-300 font-sans">
            <Sidebar />
            <div className="flex flex-col flex-1 w-full">
                <Topbar isDark={isDark} toggleTheme={() => setIsDark(!isDark)} />
                <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-6 xl:p-8">
                    {/* Bản Fix: Xử lý an toàn truyền isDark cho toàn bộ children */}
                    {React.Children.map(children, (child) => {
                        if (React.isValidElement(child)) {
                            return React.cloneElement(child as React.ReactElement<any>, { isDark });
                        }
                        return child;
                    })}
                </main>
            </div>
        </div>
    );
}