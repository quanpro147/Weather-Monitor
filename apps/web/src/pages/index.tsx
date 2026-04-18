import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import DashboardOverview from '../components/features/dashboard/DashboardOverview';
import AiSummaryPanel from '../components/features/insight-hub/AiSummaryPanel';
export default function Home() {
    return (
        <>
            <Head>
                <title>Command Center | Weather Monitor</title>
            </Head>
            
            <MainLayout>
                <DashboardOverview />
                    <AiSummaryPanel cityId={701} />
            </MainLayout>
        </>
    );
}