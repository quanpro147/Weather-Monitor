import type { AppProps } from 'next/app';
import { GlobalFilterProvider } from '../hooks/useGlobalFilter';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <GlobalFilterProvider>
      <Component {...pageProps} />
    </GlobalFilterProvider>
  );
}