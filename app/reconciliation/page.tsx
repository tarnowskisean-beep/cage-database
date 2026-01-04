
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
        amount: Number(p.TotalPeriodAmount)
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Header */}
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Reconciliation Dashboard</h1>
                    <p className="text-gray-500 mt-1 text-lg">Weekly cash flow verification and banking oversight.</p>
                </div>
                <div className="flex gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <select
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none px-2"
                        value={selectedClient}
                        onChange={e => setSelectedClient(e.target.value)}
                    >
                        <option value="">All Clients</option>
                        {clients.map(c => <option key={c.ClientID} value={c.ClientID}>{c.ClientCode}</option>)}
                    </select>
                    <button
                        className="bg-black hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
                        onClick={handleCreatePeriod}
                    >
                        + New Period
                    </button>
                </div>
            </header>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Evaluated</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${totalVolume.toLocaleString()}</p>
                    <div className="mt-2 text-xs text-green-600 font-medium flex items-center">
                        <span className="bg-green-100 px-2 py-0.5 rounded-full">Lifetime Volume</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Avg. Weekly Input</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${avgVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <div className="mt-2 text-xs text-blue-600 font-medium flex items-center">
                        <span className="bg-blue-100 px-2 py-0.5 rounded-full">Per Period Average</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm transition-all hover:shadow-md">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Action</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{pendingPeriods} Weeks</p>
                    <div className={`mt-2 text-xs font-medium flex items-center ${pendingPeriods > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                        <span className={`px-2 py-0.5 rounded-full ${pendingPeriods > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                            {pendingPeriods > 0 ? 'Requires Attention' : 'All Clear'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-10">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Weekly Donation Volume</h3>
                    <span className="text-xs text-gray-400">Last 8 Weeks</span>
                </div>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                tickFormatter={(val) => `$${val / 1000}k`}
                            />
                            <Tooltip
                                cursor={{ fill: '#f9fafb' }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="amount" fill="#1e293b" radius={[6, 6, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">Recent Periods</h3>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading periods...</div>
                ) : periods.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">No data available. Create a period to start.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-xs font-semibold">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-lg">Client</th>
                                    <th className="px-6 py-4">Period Range</th>
                                    <th className="px-6 py-4">Transfer Date</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Volume</th>
                                    <th className="px-6 py-4 text-center">Verified</th>
                                    <th className="px-6 py-4 text-right rounded-tr-lg">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {periods.map((p) => (
                                    <tr key={p.ReconciliationPeriodID} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-900">{p.ClientName}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(p.PeriodStartDate).toLocaleDateString()} — {new Date(p.PeriodEndDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono">
                                            {new Date(p.ScheduledTransferDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`
                                                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${p.Status === 'Open' ? 'bg-blue-100 text-blue-800' : ''}
                                                ${p.Status === 'Reconciled' ? 'bg-green-100 text-green-800' : ''}
                                                ${p.Status === 'Exception' ? 'bg-red-100 text-red-800' : ''}
                                                ${p.Status === 'Transferred' ? 'bg-purple-100 text-purple-800' : ''}
                                                ${p.Status === 'Scheduled' ? 'bg-amber-100 text-amber-800' : ''}
                                            `}>
                                                {p.Status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                                            ${Number(p.TotalPeriodAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {p.BankBalanceVerified ? (
                                                <span className="text-green-500 text-lg">●</span>
                                            ) : (
                                                <span className="text-gray-300 text-lg">●</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/reconciliation/${p.ReconciliationPeriodID}`}
                                                className="text-gray-900 font-medium hover:text-blue-600 transition-colors"
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
