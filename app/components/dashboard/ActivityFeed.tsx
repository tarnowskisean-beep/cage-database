import { useRouter } from 'next/navigation';
import { AuditLog } from '@/types/dashboard';

interface ActivityFeedProps {
    logs: AuditLog[];
}

export default function ActivityFeed({ logs }: ActivityFeedProps) {
    const router = useRouter();

    return (
        <div className="glass-panel p-0 overflow-hidden flex flex-col h-[400px]">
            <div className="p-6 border-b border-[var(--glass-border)] bg-white/5 flex justify-between items-center">
                <h3 className="text-lg font-display text-white">System Activity</h3>
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold animate-pulse">Live</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {logs && logs.length > 0 ? (
                    <div className="divide-y divide-white/5">
                        {logs.map((log) => {
                            // Determine Icon & Color based on Action
                            let icon = '📝';
                            let colorClass = 'text-gray-400 bg-gray-400/10';

                            const action = log.Action?.toUpperCase() || '';
                            if (action.includes('LOGIN')) { icon = '🔑'; colorClass = 'text-emerald-400 bg-emerald-400/10'; }
                            else if (action.includes('DELETE')) { icon = '🗑️'; colorClass = 'text-rose-400 bg-rose-400/10'; }
                            else if (action.includes('CREATE') || action.includes('ADD')) { icon = '✨'; colorClass = 'text-blue-400 bg-blue-400/10'; }
                            else if (action.includes('UPDATE') || action.includes('EDIT')) { icon = '✏️'; colorClass = 'text-amber-400 bg-amber-400/10'; }
                            else if (action.includes('EXPORT')) { icon = '⬇️'; colorClass = 'text-purple-400 bg-purple-400/10'; }

                            return (
                                <div key={log.AuditID} className="p-4 hover:bg-white/5 transition-colors group">
                                    <div className="flex gap-4">
                                        {/* Icon Box */}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colorClass} shrink-0`}>
                                            {icon}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-medium text-white truncate pr-2" title={log.Action}>{log.Action}</h4>
                                                <span className="text-[10px] text-gray-500 font-mono whitespace-nowrap pt-1">
                                                    {new Date(log.CreatedAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate group-hover:text-gray-300 transition-colors">{log.Details}</p>

                                            {/* Actor */}
                                            <div className="flex items-center gap-2 mt-2">
                                                <div className="w-4 h-4 rounded bg-zinc-800 text-gray-400 flex items-center justify-center text-[8px] font-bold uppercase">
                                                    {log.Actor?.[0] || 'S'}
                                                </div>
                                                <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-medium">{log.Actor || 'System'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                        <span className="text-2xl opacity-20">📜</span>
                        <span className="text-xs uppercase tracking-widest">No recent activity</span>
                    </div>
                )}
            </div>
            <div className="p-3 border-t border-[var(--glass-border)] bg-zinc-900/50">
                <button
                    onClick={() => router.push('/audit')}
                    className="w-full py-2 text-[10px] text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all uppercase tracking-widest font-bold"
                >
                    View Full Audit Log
                </button>
            </div>
        </div>
    );
}
