import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import SettingsView from '../components/features/settings/SettingsView';

export default function SettingsPage() {
    return (
        <>
            <Head>
                <title>System Settings | Command Center</title>
            </Head>
            <MainLayout>
                <SettingsView />
            </MainLayout>
        </>
    );
}
