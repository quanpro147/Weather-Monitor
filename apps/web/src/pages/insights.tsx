import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import InsightsView from '../components/features/insight-hub/InsightsView';

export default function InsightsPage() {
    return (
        <>
            <Head>
                <title>AI Insights & Alerts | Command Center</title>
            </Head>

            <MainLayout>
                <InsightsView />
            </MainLayout>
        </>
    );
}