"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading') {
        return <div className="p-12 text-center text-gray-500">Loading settings...</div>;
    }

    if (!session?.user || (session.user as any).role !== 'Admin') {
        return (
            <div className="max-w-4xl mx-auto mt-20 p-8 glass-panel border-red-900/50 bg-red-900/10 text-center">
                <div className="text-4xl mb-4">🚫</div>
                <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
                <p className="text-gray-400">You do not have permission to view this page.</p>
                <p className="text-sm text-gray-500 mt-4">Required Role: Admin</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <header className="mb-8">
                <h1 className="text-3xl font-display text-white mb-2">System Settings</h1>
                <p className="text-gray-400">Manage users, security, and global configurations.</p>
            </header>

            <div className="grid grid-cols-12 gap-8">
                {/* Sidebar */}
                <div className="col-span-3">
                    <div className="glass-panel p-2 bg-[#1a1a1a]">
                        <nav className="flex flex-col gap-1">
                            <SettingsTab
                                label="User Management"
                                active={activeTab === 'users'}
                                onClick={() => setActiveTab('users')}
                                icon="👥"
                            />
                            <SettingsTab
                                label="Audit Logs"
                                active={activeTab === 'audit'}
                                onClick={() => setActiveTab('audit')}
                                icon="📜"
                            />
                            <SettingsTab
                                label="Security"
                                active={activeTab === 'security'}
                                onClick={() => setActiveTab('security')}
                                icon="🔒"
                            />
                            <SettingsTab
                                label="Prompts & AI"
                                active={activeTab === 'ai'}
                                onClick={() => setActiveTab('ai')}
                                icon="🤖"
                            />
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="col-span-9">
                    <div className="glass-panel p-8 bg-[#1a1a1a] min-h-[500px]">
                        {activeTab === 'users' && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">User Management</h2>
                                <div className="text-center py-12 text-gray-500">
                                    <p>User list would go here.</p>
                                    <button className="btn-primary mt-4 px-4 py-2 text-sm">+ Invite User</button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'audit' && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">System Audit Logs</h2>
                                <div className="space-y-4">
                                    <div className="p-4 bg-black/40 rounded border border-gray-800 flex justify-between items-center text-sm">
                                        <div>
                                            <span className="text-[var(--color-accent)] font-mono">admin_user</span>
                                            <span className="text-gray-400"> updated batch </span>
                                            <span className="text-white font-mono">#1024</span>
                                        </div>
                                        <div className="text-gray-600">2 mins ago</div>
                                    </div>
                                    <div className="p-4 bg-black/40 rounded border border-gray-800 flex justify-between items-center text-sm">
                                        <div>
                                            <span className="text-[var(--color-accent)] font-mono">system</span>
                                            <span className="text-gray-400"> ran nightly backup</span>
                                        </div>
                                        <div className="text-gray-600">4 hours ago</div>
                                    </div>
                                    <div className="text-center pt-4 text-gray-500 text-xs">Viewing last 2 of 14,293 events</div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-6 border-b border-gray-800 pb-4">Security Configuration</h2>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-white font-medium">Reforce 2FA for All Admins</div>
                                            <div className="text-gray-500 text-sm">Require Time-based One Time Password for all admin logins.</div>
                                        </div>
                                        <div className="w-12 h-6 bg-[var(--color-primary)] rounded-full relative cursor-pointer opacity-100">
                                            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between opacity-50">
                                        <div>
                                            <div className="text-white font-medium">IP Allowlisting</div>
                                            <div className="text-gray-500 text-sm">Restrict admin access to specific IP ranges.</div>
                                        </div>
                                        <div className="w-12 h-6 bg-gray-700 rounded-full relative cursor-pointer">
                                            <div className="absolute left-1 top-1 w-4 h-4 bg-gray-400 rounded-full shadow"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="text-center py-12 text-gray-500">
                                <p>AI Prompt Configuration coming soon.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SettingsTab({ label, active, onClick, icon }: { label: string, active: boolean, onClick: () => void, icon: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all text-sm font-medium ${active
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
        >
            <span>{icon}</span>
            {label}
        </button>
    );
}
