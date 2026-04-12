import React from 'react';
import Head from 'next/head';
import Sidebar from '../components/layout/Sidebar';
import DashboardOverview from '../components/features/dashboard/DashboardOverview';

export default function HomeDashboardPage() {
    return (
        <div className="flex h-screen bg-[#F8FAFC] font-sans overflow-hidden">
            <Head>
                <title>Dashboard | Weather Monitor & Analytics</title>
            </Head>

            {/* Sidebar cố định bên trái */}
            <Sidebar />

            {/* Khu vực nội dung chính có thể scroll */}
            <div className="flex-1 overflow-y-auto">
                <DashboardOverview />
            </div>
        </div>
    );
}