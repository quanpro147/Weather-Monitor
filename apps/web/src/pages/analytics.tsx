import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import EdaView from '../components/features/data-analytics/EdaView';

export default function AnalyticsPage() {
    return (
        <>
            <Head>
                <title>Data Analytics (EDA) | Command Center</title>
            </Head>

            <MainLayout>
                <div className="min-h-0 w-full overflow-x-hidden">
                    <EdaView />
                </div>
            </MainLayout>
        </>
    );
}