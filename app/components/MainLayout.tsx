"use client";

import { useSidebar } from '@/app/hooks/useSidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    // Subscribing to context creates a dependency on SidebarProvider
    // Even if we don't use 'isCollapsed', checking it ensures we re-render if needed (though flex handles it)
    const { isCollapsed } = useSidebar();

    return (
        <main
            className="main-content"
            style={{
                flex: 1,
                height: '100vh',
                overflowY: 'auto'
            }}
        >
            {children}
        </main>
    );
}
