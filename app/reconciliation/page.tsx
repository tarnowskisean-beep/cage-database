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
                    <h2 className="text-sm font-medium tracking-wide text-blue-400 uppercase mb-2">Financial Oversight</h2>
                    <h1 className="text-4xl font-display text-white tracking-tight font-bold drop-shadow-md">Reconciliation</h1>
                </div>

                <div className="flex gap-4 items-center">
                    <div className="relative group">
                        <select
                            className="input-field min-w-[200px]"
                            value={selectedClient}
                            onChange={e => setSelectedClient(e.target.value)}
                        >
                            <option value="">All Clients</option>
                            {clients.map(c => <option key={c.ClientID} value={c.ClientID}>{c.ClientCode}</option>)}
                        </select>
                    </div>

                    <button
                        className="btn-primary shadow-lg hover:shadow-blue-500/20"
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
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500 opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Total Verified Volume</p>
                    <p className="text-4xl font-display text-white mt-2 font-bold">${totalVolume.toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></span>
                        <span className="text-sm text-gray-300">Lifetime Verified</span>
                    </div>
                </div>

                <div className="glass-panel p-8 relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-purple-500 opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity"></div>

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Weekly Average</p>
                    <p className="text-4xl font-display text-white mt-2 font-bold">${avgVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-sm text-purple-400">Consistent Flow</span>
                    </div>
                </div>

                <div className="glass-panel p-8 relative overflow-hidden group border border-[var(--glass-border)]">
                    {pendingPeriods > 0 && (
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent animate-pulse"></div>
                    )}

                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Action Required</p>
                    <p className="text-4xl font-display text-white mt-2 font-bold">{pendingPeriods} <span className="text-lg font-sans text-gray-500 font-normal">Weeks</span></p>
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
                        <h3 className="text-xl font-display text-white font-bold">Cash Flow Visualization</h3>
                        <p className="text-sm text-gray-400 mt-1">Weekly donation volume trends (Last 8 Weeks)</p>
                    </div>
                    {/* Key/Legend */}
                    <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-gray-700"></span>
                            <span className="text-gray-400">Standard</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
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
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                tickFormatter={(val) => `$${val / 1000}k`}
                                dx={-10}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '12px 16px',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                    color: '#fff'
                                }}
                                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Volume']}
                            />
                            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.amount > avgVolume ? '#3b82f6' : '#334155'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Modern Table */}
            <div className="glass-panel overflow-hidden">
                <div className="px-8 py-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-white/5">
                    <h3 className="text-xl font-display text-white font-bold">Reconciliation Period History</h3>
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
                        <table className="data-table">
                            <thead>
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
                            <tbody>
                                {periods.map((p) => (
                                    <tr key={p.ReconciliationPeriodID} className="group transition-colors">
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
                                                className="text-blue-400 hover:text-white font-medium text-xs uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
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
