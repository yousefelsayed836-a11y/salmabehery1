import type { Metadata } from 'next';
import { Inter, Cairo, Bodoni_Moda } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import { CartProvider } from '../components/CartContext';

const inter = Inter({ subsets: ['latin'] });
const cairo = Cairo({ subsets: ['arabic'], variable: '--font-cairo' });
const bodoni = Bodoni_Moda({ 
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-bodoni',
});

export const metadata: Metadata = {
  title: 'Salma Behery - Jewelry Store',
  description: 'Premium handcrafted jewelry collection',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.className} ${cairo.variable} ${bodoni.variable}`} style={{ background: '#fff', margin: 0 }}>
        <CartProvider>
          <Header />
          <main style={{ minHeight: '100vh', background: '#fff' }}>
            {children}
          </main>
        </CartProvider>
      </body>
    </html>
  );
}
