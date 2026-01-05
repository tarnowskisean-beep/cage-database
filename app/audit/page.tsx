'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Log {
    AuditID: number;
    Action: string;
    Actor: string;
    Details: string;
    CreatedAt: string;
    IPAddress?: string;
}

export default function AuditLogPage() {
    const router = useRouter();
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const fetchLogs = (p: number) => {
        setLoading(true);
        fetch(`/api/audit?limit=50&offset=${(p - 1) * 50}`)
            .then(res => res.json())
            .then(data => {
                setLogs(data.logs || []);
                setTotalPages(data.totalPages || 1);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="page-header mb-8 flex items-end justify-between">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">System Security</h2>
                    <h1 className="text-4xl text-white font-display">Audit Logs</h1>
                </div>
                <Link href="/" className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
                    Back to Dashboard &rarr;
                </Link>
            </header>

            <div className="glass-panel overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 border-b border-white/10 text-gray-400 uppercase text-xs font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Actor</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4 w-1/2">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.map((log) => (
                                <tr key={log.AuditID} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                                        {new Date(log.CreatedAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                {log.Actor?.[0] || 'S'}
                                            </div>
                                            <span className="text-white font-medium text-xs">{log.Actor || 'System'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide
                                            ${log.Action.includes('LOGIN') ? 'bg-emerald-500/10 text-emerald-400' :
                                                log.Action.includes('DELETE') ? 'bg-rose-500/10 text-rose-400' :
                                                    log.Action.includes('CREATE') ? 'bg-blue-500/10 text-blue-400' :
                                                        'bg-zinc-500/10 text-gray-400'
                                            }
                                        `}>
                                            {log.Action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-gray-400 text-xs font-mono truncate max-w-xl" title={log.Details}>
                                        {log.Details}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center bg-zinc-900/50">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                        className="px-4 py-2 bg-zinc-800 text-xs font-bold uppercase rounded disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-xs text-gray-500 font-mono">Page {page} of {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 bg-zinc-800 text-xs font-bold uppercase rounded disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
