"use client";

import { useSidebar } from '@/app/hooks/useSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();

    return (
        <main
            className="main-content"
            style={{
                flex: 1,
                height: '100vh',
                overflowY: 'auto',
                marginLeft: isCollapsed ? '80px' : 'var(--sidebar-width)',
                transition: 'margin-left 0.3s ease'
            }}
        >
            {children}
        </main>
    );
}
