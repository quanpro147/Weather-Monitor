import type { AppProps } from 'next/app';
import { GlobalFilterProvider } from '../hooks/useGlobalFilter';
import { ThemeProvider } from '../contexts/ThemeContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <GlobalFilterProvider>
        <Component {...pageProps} />
      </GlobalFilterProvider>
    </ThemeProvider>
  );
}