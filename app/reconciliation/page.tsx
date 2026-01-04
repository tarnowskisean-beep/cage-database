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
        fetch('/api/clients', { cache: 'no-store' }).then(res => res.json()).then(setClients).catch(console.error);
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
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="page-header flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Financial Oversight</h2>
                    <h1 className="text-4xl text-white font-display">Reconciliation</h1>
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
                        className="btn-primary"
                        onClick={handleCreatePeriod}
                    >
                        + New Period
                    </button>
                </div>
            </header>

            {/* Glass Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-panel p-8 relative overflow-hidden group">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Total Verified Volume</p>
                    <p className="text-4xl font-display text-white mt-2 font-bold">${totalVolume.toLocaleString()}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        <span className="text-sm text-gray-400">All Time</span>
                    </div>
                </div>

                <div className="glass-panel p-8 relative overflow-hidden group">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Weekly Average</p>
                    <p className="text-4xl font-display text-white mt-2 font-bold">${avgVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <div className="mt-4 flex items-center gap-2">
                        <span className="text-sm text-gray-400">Consistent Flow</span>
                    </div>
                </div>

                <div className="glass-panel p-8 relative overflow-hidden group">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Action Required</p>
                    <p className="text-4xl font-display text-white mt-2 font-bold">{pendingPeriods} <span className="text-lg font-sans text-gray-500 font-normal">Weeks</span></p>
                    <div className={`mt-4 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${pendingPeriods > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                        }`}>
                        {pendingPeriods > 0 ? 'Review Needed' : 'All Clear'}
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="glass-panel p-8 mb-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-display text-white font-bold">Volume Trends</h3>
                    </div>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#71717a', fontSize: 11 }}
                                dy={15}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#71717a', fontSize: 11 }}
                                tickFormatter={(val) => `$${val / 1000}k`}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    border: '1px solid #27272a',
                                    borderRadius: '4px',
                                    padding: '12px',
                                    color: '#fff'
                                }}
                                formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Volume']}
                            />
                            <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.amount > avgVolume ? '#ffffff' : '#52525b'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table */}
            <div className="glass-panel overflow-hidden">
                <div className="px-8 py-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-display text-white font-bold">History</h3>
                    <div className="text-xs text-gray-500 tracking-widest uppercase">
                        {periods.length} Records
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-500 animate-pulse text-xs uppercase tracking-widest">Loading Records...</div>
                ) : periods.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">No reconciliation periods found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="px-8 py-4">Client</th>
                                    <th className="px-6 py-4">Period Range</th>
                                    <th className="px-6 py-4">Transfer Date</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Volume</th>
                                    <th className="px-6 py-4 text-center">Verified</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map((p) => (
                                    <tr key={p.ReconciliationPeriodID} className="group hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-4 text-white font-medium">{p.ClientName}</td>
                                        <td className="px-6 py-4 text-gray-400 text-xs uppercase tracking-wider">
                                            {new Date(p.PeriodStartDate).toLocaleDateString()} — {new Date(p.PeriodEndDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                            {new Date(p.ScheduledTransferDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`
                                                inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border
                                                ${p.Status === 'Open' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : ''}
                                                ${p.Status === 'Reconciled' ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''}
                                                ${p.Status === 'Exception' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                                                ${p.Status === 'Transferred' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : ''}
                                                ${p.Status === 'Scheduled' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                                            `}>
                                                {p.Status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-white font-mono">
                                            ${Number(p.TotalPeriodAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.BankBalanceVerified ? (
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mx-auto"></div>
                                            ) : (
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 mx-auto"></div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/reconciliation/${p.ReconciliationPeriodID}`}
                                                className="text-gray-500 hover:text-white font-bold text-xs uppercase tracking-wide transition-colors"
                                            >
                                                Details &rarr;
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
