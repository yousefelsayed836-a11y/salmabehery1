import type { Metadata } from 'next';
import { Inter, Cairo, Cormorant_Garamond, Cinzel_Decorative, Roboto_Condensed } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import Ticker from '../components/Ticker';
import { CartProvider } from '../components/CartContext';
import FaviconUpdater from '../components/FaviconUpdater';
import FacebookPixel from '../components/FacebookPixel';
import KeepAlive from '../components/KeepAlive';

const inter = Inter({ subsets: ['latin'] });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
});
const cinzelDecorative = Cinzel_Decorative({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  variable: '--font-cinzel',
});
const robotoCondensed = Roboto_Condensed({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-roboto-condensed',
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,400;6..96,700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.className} ${cairo.variable} ${cormorant.variable} ${cinzelDecorative.variable} ${robotoCondensed.variable}`} style={{ background: '#fff', margin: 0 }}>
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
