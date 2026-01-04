
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function ReconciliationDashboard() {
    const [periods, setPeriods] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState('');

    useEffect(() => {
        fetch('/api/clients').then(res => res.json()).then(setClients).catch(console.error);
    }, []);

    useEffect(() => {
        let url = '/api/reconciliation/periods?';
        if (selectedClient) url += `clientId=${selectedClient}`;

        setLoading(true);
        fetch(url)
            .then(res => res.json())
            .then(data => {
                setPeriods(Array.isArray(data) ? data : []);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedClient]);

    const handleCreatePeriod = async () => {
        if (!selectedClient) return alert('Select a client first');
        const end = prompt("Enter Period End Date (e.g. 2025-01-31):", new Date().toISOString().slice(0, 10));
        if (!end) return;

        // Dynamic Start Date (Monday)
        const d = new Date(end);
        const day = d.getDay();
        const daysToMonday = day === 0 ? 6 : day - 1;

        const start = new Date(d);
        start.setDate(d.getDate() - daysToMonday);
        const startStr = start.toISOString().slice(0, 10);

        try {
            const res = await fetch('/api/reconciliation/periods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: selectedClient, startDate: startStr, endDate: end })
            });

            if (res.ok) window.location.reload();
            else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (e) {
            alert('Failed to create period');
        }
    };

    // Metrics Calculation
    const totalVolume = periods.reduce((acc, p) => acc + Number(p.TotalPeriodAmount), 0);
    const pendingPeriods = periods.filter(p => p.Status === 'Open' || p.Status === 'Exception').length;
    const avgVolume = periods.length > 0 ? totalVolume / periods.length : 0;

    // Chart Data (Reverse chronological for chart, limit 8)
    const chartData = [...periods].reverse().slice(-8).map(p => ({
        name: new Date(p.PeriodEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        amount: Number(p.TotalPeriodAmount),
        status: p.Status
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Premium Header */}
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-[var(--color-accent)] uppercase mb-2">Financial Oversight</h2>
                    <h1 className="text-4xl font-display text-white tracking-tight">Reconciliation</h1>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="relative group">
                        <select
                            className="appearance-none bg-[var(--color-bg-elevated)] text-white text-sm font-medium pl-4 pr-10 py-3 rounded border border-[var(--color-border)] outline-none focus:border-[var(--color-accent)] transition-colors cursor-pointer"
                            value={selectedClient}
                            onChange={e => setSelectedClient(e.target.value)}
                        >
                            <option value="">All Clients</option>
                            {clients.map(c => <option key={c.ClientID} value={c.ClientID}>{c.ClientCode}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="transform group-hover:text-white transition-colors">
                                <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </div>

                    <button
                        className="bg-white text-black hover:bg-gray-200 text-sm font-semibold px-6 py-3 rounded uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                        onClick={handleCreatePeriod}
                    >
                        + New Period
                    </button>
                </div>
            </header>

            {/* Glass Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="glass-panel p-8 relative overflow-hidden group">
                    {/* Decorative glow */}
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--color-brand-blue)] opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Total Verified Volume</p>
                    <p className="text-4xl font-display text-white mt-2">${totalVolume.toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                        <span className="text-sm text-gray-300">Lifetime Verified</span>
                    </div>
                </div>

                <div className="glass-panel p-8 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--color-accent)] opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Weekly Average</p>
                    <p className="text-4xl font-display text-white mt-2">${avgVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-sm text-[var(--color-accent)]">Consistent Flow</span>
                    </div>
                </div>

                <div className="glass-panel p-8 relative overflow-hidden group border border-[var(--color-border)]">
                    {pendingPeriods > 0 && (
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent animate-pulse"></div>
                    )}

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Action Required</p>
                    <p className="text-4xl font-display text-white mt-2">{pendingPeriods} <span className="text-lg font-sans text-gray-500 font-normal">Weeks</span></p>
                    <div className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pendingPeriods > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                        }`}>
                        {pendingPeriods > 0 ? 'Verification Needed' : 'All Clear'}
                    </div>
                </div>
            </div>

            {/* Dark Chart Section */}
            <div className="glass-panel p-8 mb-12">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-display text-white">Cash Flow Visualization</h3>
                        <p className="text-sm text-gray-500 mt-1">Weekly donation volume trends (Last 8 Weeks)</p>
                    </div>
                    {/* Key/Legend */}
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-[#334155]"></span>
                            <span className="text-gray-400">Standard</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-[var(--color-accent)]"></span>
                            <span className="text-gray-400">High Volume</span>
                        </div>
                    </div>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'var(--font-body)' }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6b7280', fontSize: 11, fontFamily: 'var(--font-body)' }}
                                tickFormatter={(val) => `$${val / 1000}k`}
                                dx={-10}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#1a1a1a',
                                    border: '1px solid #333',
                                    borderRadius: '0px',
                                    padding: '12px 16px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                }}
                                itemStyle={{ color: '#fff', fontFamily: 'var(--font-body)', fontSize: '13px' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Volume']}
                            />
                            <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.amount > avgVolume ? 'var(--color-accent)' : '#334155'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Modern Table */}
            <div className="glass-panel overflow-hidden">
                <div className="px-8 py-6 border-b border-[var(--color-border)] flex justify-between items-center">
                    <h3 className="text-xl font-display text-white">Reconciliation Period History</h3>
                    <div className="text-xs text-gray-500 tracking-widest uppercase">
                        Showing {periods.length} Records
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-gray-500 animate-pulse">Accessing secure ledger...</div>
                ) : periods.length === 0 ? (
                    <div className="p-20 text-center text-gray-500">No periods found. Start a new reconciliation cycle.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#1f1f1f] text-gray-400 uppercase tracking-wider text-xs font-semibold">
                                <tr>
                                    <th className="px-8 py-5">Client</th>
                                    <th className="px-6 py-5">Period Range</th>
                                    <th className="px-6 py-5">Transfer Date</th>
                                    <th className="px-6 py-5 text-center">Status</th>
                                    <th className="px-6 py-5 text-right">Volume</th>
                                    <th className="px-6 py-5 text-center">Verified</th>
                                    <th className="px-6 py-5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border-subtle)]">
                                {periods.map((p) => (
                                    <tr key={p.ReconciliationPeriodID} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-8 py-5 text-white font-medium">{p.ClientName}</td>
                                        <td className="px-6 py-5 text-gray-400">
                                            {new Date(p.PeriodStartDate).toLocaleDateString()} — <span className="text-gray-300">{new Date(p.PeriodEndDate).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-6 py-5 text-gray-500 font-mono text-xs">
                                            {new Date(p.ScheduledTransferDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`
                                                inline-flex items-center px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border
                                                ${p.Status === 'Open' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                                                ${p.Status === 'Reconciled' ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''}
                                                ${p.Status === 'Exception' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                                                ${p.Status === 'Transferred' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : ''}
                                                ${p.Status === 'Scheduled' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                                            `}>
                                                {p.Status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right font-medium text-white font-mono">
                                            ${Number(p.TotalPeriodAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            {p.BankBalanceVerified ? (
                                                <div className="w-2 h-2 rounded-full bg-green-500 mx-auto shadow-[0_0_8px_#22c55e]"></div>
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-gray-700 mx-auto"></div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <Link
                                                href={`/reconciliation/${p.ReconciliationPeriodID}`}
                                                className="text-[var(--color-accent)] hover:text-white font-medium text-xs uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                                            >
                                                Manage &rarr;
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

