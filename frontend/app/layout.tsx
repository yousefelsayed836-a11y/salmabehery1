import type { Metadata } from 'next';
import { Inter, Cairo, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import Ticker from '../components/Ticker';
import { CartProvider } from '../components/CartContext';
import FaviconUpdater from '../components/FaviconUpdater';
import FacebookPixel from '../components/FacebookPixel';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});

export const metadata: Metadata = {
  title: 'Salma Behery - Jewelry Store',
  description: 'Premium handcrafted jewelry collection',
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'CinzelDeco';
            src: url('/fonts/CinzelDecorative.otf') format('opentype');
            font-weight: 400;
            font-style: normal;
            font-display: block;
          }
        `}} />
      </head>
      <body className={`${inter.variable} ${cairo.variable} ${cormorant.variable}`} style={{ background: '#fff', margin: 0 }}>
        <CartProvider>
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
