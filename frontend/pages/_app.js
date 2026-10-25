import Head from 'next/head';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from '../lib/auth';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Head><title>Assinatura Digital</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <CssBaseline />
      <Component {...pageProps} />
    </AuthProvider>
  );
}
