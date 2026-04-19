import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import DashboardOverview from '../components/features/dashboard/DashboardOverview';
import AiSummaryPanel from '../components/features/insight-hub/AiSummaryPanel';
import { useGlobalFilter } from '../hooks/useGlobalFilter';

export default function Home() {
    const { cityId } = useGlobalFilter();

    return (
        <>
            <Head>
                <title>Command Center | Weather Monitor</title>
            </Head>
            
            <MainLayout>
                <DashboardOverview />
                <AiSummaryPanel cityId={cityId} />
            </MainLayout>
        </>
    );
}