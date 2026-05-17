import type { Metadata } from 'next';
import { Inter, Roboto_Condensed } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import Ticker from '../components/Ticker';
import { CartProvider } from '../components/CartContext';
import FaviconUpdater from '../components/FaviconUpdater';
import FacebookPixel from '../components/FacebookPixel';
import KeepAlive from '../components/KeepAlive';

const inter = Inter({ subsets: ['latin'], display: 'swap' });
const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-roboto-condensed',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Salma Behery - Jewelry Store',
  description: 'Premium handcrafted jewelry collection',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.className} ${robotoCondensed.variable}`} style={{ background: '#fff', margin: 0 }}>
        <CartProvider>
          <KeepAlive />
          <FaviconUpdater />
          <FacebookPixel />
          <Ticker />
          <Header />
          <main style={{ minHeight: '100vh', background: '#fff' }}>
            {children}
          </main>
        </CartProvider>
      </body>
    </html>
  );
}
