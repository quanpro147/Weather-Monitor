import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import StationsView from '../components/features/stations/StationsView';

export default function StationsPage() {
    return (
        <>
            <Head>
                <title>Station Management | Command Center</title>
            </Head>
            <MainLayout>
                <StationsView />
            </MainLayout>
        </>
    );
}
