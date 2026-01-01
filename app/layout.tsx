import './globals.css';
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import Link from 'next/link';

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
      <body className={`${inter.variable} ${outfit.variable}`}>
        <div className="app-shell">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="brand-header">
              <h1 className="brand-text">
                COMPASS
              </h1>
              <p style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', letterSpacing: '0.1em', marginTop: '0.25rem', textTransform: 'uppercase' }}>Caging Database</p>
            </div>

            <nav className="nav-menu">
              <NavLink href="/" label="Dashboard" icon="📊" />
              <NavLink href="/clients" label="Clients" icon="🏢" />
              <NavLink href="/batches" label="Batches" icon="📦" />
              <NavLink href="/search" label="Search" icon="🔍" />
              <NavLink href="/reconciliation" label="Reconciliation" icon="⚖️" />
            </nav>

            <div className="user-profile">
              <div className="avatar">AG</div>
              <div className="user-info">
                <div className="name">Alyssa Graham</div>
                <div className="role">Clerk</div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link href={href} className="nav-link">
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
