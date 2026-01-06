"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarProvider } from "@/app/hooks/useSidebar";

import { Session } from "next-auth";

export function Providers({ children, session }: { children: React.ReactNode, session?: Session | null }) {
    return (
        <SessionProvider session={session}>
            <SidebarProvider>
                {children}
            </SidebarProvider>
        </SessionProvider>
    );
}
