/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DistributionChart from './components/DistributionChart';
import KPIGrid from './components/dashboard/KPIGrid';
import MainChart from './components/dashboard/MainChart';
import ActivityFeed from './components/dashboard/ActivityFeed';
import { DashboardStats, ChartDataPoint } from '@/types/dashboard';

function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
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
  const chartData: ChartDataPoint[] = (stats?.chartData || []).map((d: any) => ({
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

      {/* ACTION REQUIRED: Pending Resolutions */}
      {/* @ts-ignore */}
      {stats?.pendingResolutions > 0 && (
        <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <svg className="w-6 h-6 text-yellow-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h3 className="text-yellow-500 font-bold uppercase tracking-wide text-sm">Action Required</h3>
              {/* @ts-ignore */}
              <p className="text-gray-300 text-sm">There are <strong className="text-white">{stats.pendingResolutions} donor identity conflicts</strong> waiting for resolution.</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/reconciliation/resolution')}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold uppercase text-xs rounded transition-colors shadow-lg shadow-yellow-500/20"
          >
            Review Items &rarr;
          </button>
        </div>
      )}

      {/* KPI COMPONENT */}
      <KPIGrid stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Component */}
        <MainChart data={chartData} metric={chartMetric} setMetric={setChartMetric} />

        {/* Activity Feed Component */}
        <ActivityFeed logs={stats?.recentLogs || []} />
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
