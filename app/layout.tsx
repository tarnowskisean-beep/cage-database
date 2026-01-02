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
            <div className="brand-header" style={{ textAlign: 'center', paddingBottom: '2rem', borderBottom: '1px solid hsla(var(--color-border), 0.3)' }}>
              {/* Compass Rose Icon */}
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'white' }}>
                  <circle cx="50" cy="50" r="45" strokeWidth="1" />
                  <path d="M50 10 L60 40 L90 50 L60 60 L50 90 L40 60 L10 50 L40 40 Z" fill="currentColor" opacity="0.9" />
                  <circle cx="50" cy="50" r="3" fill="black" />
                </svg>
              </div>
              <h1 className="brand-text" style={{
                fontFamily: 'var(--font-logo)',
                fontSize: '1.25rem',
                letterSpacing: '0.15em',
                background: 'none',
                WebkitBackgroundClip: 'unset',
                color: 'white',
                display: 'block'
              }}>
                COMPASS
              </h1>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.65rem',
                color: 'hsl(var(--color-text-muted))',
                letterSpacing: '0.3em',
                marginTop: '0.5rem',
                textTransform: 'uppercase'
              }}>
                PROFESSIONAL
              </p>
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
