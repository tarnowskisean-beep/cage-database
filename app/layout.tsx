import './globals.css';
import type { Metadata } from 'next';
import { Inter_Tight, Old_Standard_TT } from 'next/font/google';
import Sidebar from './components/Sidebar';
import { Providers } from './providers';
import MainLayout from './components/MainLayout';

import PolicyEnforcement from './components/PolicyEnforcement';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPendingPolicies } from '@/lib/policy';

const inter = Inter_Tight({ subsets: ['latin'], variable: '--font-inter' });
const oldStandard = Old_Standard_TT({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-old-standard' });

export const metadata: Metadata = {
  title: 'Compass Professional',
  description: 'High-performance donation processing system',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const pendingPolicies = session?.user?.id ? await getPendingPolicies(session.user.id) : [];

  return (
    <html lang="en">
      <body className={`${inter.variable} ${oldStandard.variable}`} style={{ display: 'flex' }}>
        <Providers session={session}>
          <PolicyEnforcement initialPolicies={pendingPolicies} />
          <Sidebar />
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}
