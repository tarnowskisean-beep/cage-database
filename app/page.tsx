/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { Suspense, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts';
import { useRouter } from 'next/navigation';
import DistributionChart from './components/DistributionChart';

function DashboardContent() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Filters
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [chartMetric, setChartMetric] = useState<'amount' | 'count'>('amount');

  // Default to Last 6 Months
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Fetch Clients
  useEffect(() => {
    fetch('/api/clients', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load clients');
        return res.json();
      })
      .then(data => setClients(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  // Fetch Stats (Debounced or on Filter Change)
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedClient) params.append('clientId', selectedClient);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    fetch(`/api/stats?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error('API Failed');
        return res.json();
      })
      .then(data => {
        setStats(data);
        setError(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [selectedClient, startDate, endDate]);

  if (error) {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-96 text-center">
        <div className="text-red-400 mb-2">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3 className="text-lg font-medium text-white">Dashboard Unavailable</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Unable to load analytics at this time. The server might be busy or unreachable.
          </p>
        </div>
        <button onClick={() => window.location.reload()} className="mt-6 btn-primary">
          Retry Connection
        </button>
      </div>
    );
  }

  if (!stats && loading) {
    return (
      <div className="p-8 flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          <div className="text-gray-500 text-sm tracking-widest uppercase">Loading Analytics...</div>
        </div>
      </div>
    );
  }

  // Chart Data Preparation (Monochrome)
  const chartData = (stats?.chartData || []).map((d: any) => ({
    ...d,
    color: '#ffffff' // White bars
  }));

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8">
      <header className="page-header flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Executive Overview</h2>
          <h1 className="text-4xl">Dashboard</h1>
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="input-field bg-zinc-900 text-white border-zinc-700 focus:ring-0 focus:border-white/50"
            style={{ width: '200px', padding: '0.4rem' }}
            value={selectedClient}
            onChange={e => setSelectedClient(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.length > 0 ? (
              clients.map(c => (
                <option key={c.ClientID} value={c.ClientID}>{c.ClientName} ({c.ClientCode})</option>
              ))
            ) : (
              <option disabled>No Clients Found</option>
            )}
          </select>

          <input
            type="date"
            className="input-field"
            style={{ width: '140px', padding: '0.4rem' }}
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <span className="text-gray-500">-</span>
          <input
            type="date"
            className="input-field"
            style={{ width: '140px', padding: '0.4rem' }}
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            placeholder="End Date"
          />

          {(selectedClient || startDate || endDate) && (
            <button
              onClick={() => { setSelectedClient(''); setStartDate(''); setEndDate(''); }}
              className="text-xs text-red-400 hover:text-red-300 ml-2"
            >
              Clear
            </button>
          )}

          <span className="text-gray-600 mx-2">|</span>

          <span className="text-xs text-gray-500 uppercase tracking-widest">
            Last Updated: {new Date().toLocaleTimeString()}
          </span>
          <button onClick={() => window.location.reload()} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Raised */}
        <div className="glass-panel p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Total Revenue</p>
              <h3 className="text-3xl font-display mt-2 text-white">
                {stats?.totalValidAmount?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00'}
              </h3>
            </div>
            <div className="p-2 bg-white/5 rounded text-white">
              <span className="text-xl">💰</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-white font-medium">Filtered</span>
            <span>view</span>
          </div>
        </div>

        {/* Open Batches */}
        <div
          className="glass-panel p-6 flex flex-col justify-between h-40 cursor-pointer hover:border-white/20"
          onClick={() => router.push('/batches')}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Open Batches</p>
              <h3 className="text-3xl font-display mt-2 text-white">{stats?.openBatches || 0}</h3>
            </div>
            <div className="p-2 bg-white/5 rounded text-white">
              <span className="text-xl">📂</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {(stats?.openBatches || 0) > 0 ? (
              <span className="text-amber-400 font-medium">Action Required</span>
            ) : (
              <span className="text-gray-500">All cleared</span>
            )}
          </div>
        </div>

        {/* Closed Batches */}
        <div className="glass-panel p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Closed Batches</p>
              <h3 className="text-3xl font-display mt-2 text-white">{stats?.closedBatches || 0}</h3>
            </div>
            <div className="p-2 bg-white/5 rounded text-white">
              <span className="text-xl">✅</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-white font-medium">Archived</span>
            <span>Successfully processed</span>
          </div>
        </div>

        {/* Total Donors */}
        <div className="glass-panel p-6 flex flex-col justify-between h-40">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Unique Donors</p>
              <h3 className="text-3xl font-display mt-2 text-white">{stats?.uniqueDonors?.toLocaleString() || 0}</h3>
            </div>
            <div className="p-2 bg-white/5 rounded text-white">
              <span className="text-xl">👥</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-white font-medium">Global</span>
            <span>Across all entities</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Chart Section - Wide */}
        <div className="lg:col-span-2 glass-panel p-6 min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-display text-white">
              {chartMetric === 'amount' ? 'Revenue Trend' : 'Volume Trend'}
            </h3>
            <div className="flex gap-2 bg-zinc-900 border border-white/10 p-1 rounded-lg">
              <button
                onClick={() => setChartMetric('amount')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${chartMetric === 'amount' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
              >
                $ Revenue
              </button>
              <button
                onClick={() => setChartMetric('count')}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${chartMetric === 'count' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
              >
                # Volume
              </button>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickFormatter={(val) => chartMetric === 'amount' ? `$${val / 1000}k` : val.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                  cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '4 4' }}
                  formatter={(value: any) => chartMetric === 'amount' ? [`$${value.toLocaleString()}`, 'Revenue'] : [value.toLocaleString(), 'Count']}
                />
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="#ffffff"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Logs / Activity - Enhanced */}
        <div className="glass-panel p-0 overflow-hidden flex flex-col h-[400px]">
          <div className="p-6 border-b border-[var(--glass-border)] bg-white/5 flex justify-between items-center">
            <h3 className="text-lg font-display text-white">System Activity</h3>
            <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold animate-pulse">Live</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {stats?.recentLogs && stats.recentLogs.length > 0 ? (
              <div className="divide-y divide-white/5">
                {stats.recentLogs.map((log: any) => {
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
      </div>

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <DistributionChart title="Revenue by Platform" data={stats?.byPlatform || []} />
        <DistributionChart title="Revenue by Method" data={stats?.byMethod || []} />
      </div>

    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
