import './globals.css';
import type { Metadata } from 'next';
import { Inter_Tight, Old_Standard_TT } from 'next/font/google';
import Sidebar from './components/Sidebar';
import { Providers } from './providers';
import MainLayout from './components/MainLayout';

import PolicyEnforcement from './components/PolicyEnforcement';

const inter = Inter_Tight({ subsets: ['latin'], variable: '--font-inter' });
const oldStandard = Old_Standard_TT({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-old-standard' });

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
      <body className={`${inter.variable} ${oldStandard.variable}`} style={{ display: 'flex' }}>
        <Providers>
          <PolicyEnforcement />
          <Sidebar />
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}
