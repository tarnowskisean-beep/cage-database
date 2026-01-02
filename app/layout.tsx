import './globals.css';
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import Sidebar from './components/Sidebar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Compass Caging Database',
  description: 'High-performance donation processing system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`} style={{ display: 'flex', background: 'hsl(var(--color-bg-base))', color: 'hsl(var(--color-text-base))' }}>
        <Sidebar />
        <main style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '2rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
