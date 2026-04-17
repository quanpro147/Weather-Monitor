import Head from 'next/head';
import MainLayout from '../components/layout/MainLayout';
import FullMapView from '../components/features/geospatial-map/FullMapView';

export default function MapPage() {
    return (
        <>
            <Head>
                <title>Interactive Map | Command Center</title>
            </Head>

            <MainLayout>
                {/* Fix Bleeding Padding: Sử dụng trực tiếp class h-[calc...] không ôm negative margin như ban đầu làm sát màn, thay vào đó lợi dụng padding (p-4 md:p-6 xl:p-8) có sẳn của phần main. Flex box trong component con sẽ xử lý scale. */}
                <div className="h-[calc(100vh-130px)] lg:h-[calc(100vh-160px)] relative">
                    <FullMapView />
                </div>
            </MainLayout>
        </>
    );
}