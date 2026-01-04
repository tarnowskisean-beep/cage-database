"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// Polished Palette
const COLORS = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24'];

interface Stats {
  totalRevenue: number;
  byClient: { ClientName: string; total: number }[];
  byMethod: { GiftMethod: string; count: string; total: number }[];
  byPlatform: { GiftPlatform: string; count: string; total: number }[];
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [clients, setClients] = useState<{ ClientID: number, ClientName: string, ClientCode: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate default weekly range (Sat -> Fri)
  const getWeeklyRange = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = (day + 1) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return { start: formatDate(start), end: formatDate(end) };
  };

  const defaultRange = getWeeklyRange();

  const [filters, setFilters] = useState({
    clientId: '',
    startDate: defaultRange.start,
    endDate: defaultRange.end
  });

  useEffect(() => {
    // Fetch Clients for dropdown
    const fetchClients = async () => {
      try {
        const res = await fetch('/api/clients');
        if (res.ok) setClients(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchClients();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.clientId) params.append('clientId', filters.clientId);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const res = await fetch(`/api/stats?${params.toString()}`);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [filters]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-display font-bold text-white mb-2 drop-shadow-md">
            Dashboard
          </h1>
          <p className="text-gray-400 font-light">Real-time donation insights and performance metrics</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-sm text-gray-400">Current Period</div>
          <div className="font-mono text-blue-400">{filters.startDate} <span className="text-gray-600">to</span> {filters.endDate}</div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="glass-panel p-4 mb-8 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-blue-400">
          <span className="text-xl">🔍</span>
          <span className="font-semibold text-xs uppercase tracking-wider">Filters</span>
        </div>

        <select
          className="input-field min-w-[200px]"
          value={filters.clientId}
          onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">From</span>
          <input
            type="date"
            className="input-field"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">To</span>
          <input
            type="date"
            className="input-field"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
          />
        </div>

        {(filters.clientId || filters.startDate !== defaultRange.start || filters.endDate !== defaultRange.end) && (
          <button
            onClick={() => setFilters({ clientId: '', startDate: defaultRange.start, endDate: defaultRange.end })}
            className="text-red-400 text-xs hover:text-red-300 transition-colors ml-auto uppercase font-bold tracking-wide"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && !stats ? (
        <div className="h-96 flex flex-col items-center justify-center text-gray-500 animate-pulse gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
          <div className="font-light tracking-wide">Synthesizing Data...</div>
        </div>
      ) : (stats as any)?.error ? (
        <div className="p-8 text-red-500 text-center border border-red-900/50 bg-red-900/10 rounded-xl backdrop-blur-md">
          <div className="text-2xl mb-2">⚠️</div>
          Error loading dashboard: {(stats as any).error}
        </div>
      ) : !stats ? null : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon="💰"
              trend="+12% vs last month"
              color="text-emerald-400"
            />
            <DashboardCard
              title="Total Donations"
              value={stats.byMethod ? stats.byMethod.reduce((acc, curr) => acc + parseInt(curr.count), 0).toLocaleString() : '0'}
              icon="🎁"
              color="text-blue-400"
            />
            <DashboardCard
              title="Active Batches"
              value={(stats.byClient?.length || 0).toString()}
              icon="📂"
              color="text-amber-400"
            />
            <DashboardCard
              title="Avg Donation"
              value={stats.totalRevenue && stats.byMethod ? formatCurrency(stats.totalRevenue / stats.byMethod.reduce((acc, curr) => acc + parseInt(curr.count), 0)) : '$0.00'}
              icon="📈"
              color="text-purple-400"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

            {/* Revenue by Client */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-display text-white mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                Revenue by Client
              </h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byClient} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" tickFormatter={(val) => `$${val}`} tick={{ fontSize: 10 }} />
                    <YAxis
                      dataKey="ClientName"
                      type="category"
                      stroke="#94a3b8"
                      width={150}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                        color: '#fff'
                      }}
                      formatter={(value: number | undefined) => formatCurrency(value || 0)}
                    />
                    <Bar dataKey="total" fill="url(#colorTotal)" radius={[0, 4, 4, 0]} barSize={20}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="glass-panel p-6">
              <h3 className="text-lg font-display text-white mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                Payment Methods
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.byMethod}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="GiftMethod"
                    >
                      {stats.byMethod?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.2)" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#ccc' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platforms */}
            <div className="glass-panel p-6 lg:col-span-2">
              <h3 className="text-lg font-display text-white mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                Platform Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byPlatform} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="GiftPlatform" type="category" stroke="#94a3b8" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar dataKey="count" fill="#34d399" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/batches" className="glass-panel p-8 hover:border-blue-500/50 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <h3 className="text-blue-400 font-bold mb-2 group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                  Go to Batches <span>&rarr;</span>
                </h3>
                <p className="text-gray-400 text-sm">Manage checking and donation batches</p>
              </div>
            </Link>
            <Link href="/search" className="glass-panel p-8 hover:border-emerald-500/50 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <h3 className="text-emerald-400 font-bold mb-2 group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                  Export Reports <span>&rarr;</span>
                </h3>
                <p className="text-gray-400 text-sm">Generate CSV exports via Search</p>
              </div>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardCard({ title, value, icon, trend, color }: { title: string, value: string, icon: string, trend?: string, color?: string }) {
  return (
    <div className="glass-panel p-6 flex flex-col justify-between h-32 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 text-6xl">
        {icon}
      </div>
      <div>
        <div className="text-gray-400 font-medium text-xs uppercase tracking-wider mb-2">{title}</div>
        <div className={`text-3xl font-display font-bold ${color || 'text-white'}`}>
          {value}
        </div>
      </div>
      {trend && (
        <div className="text-emerald-400 text-xs flex items-center gap-1 font-bold mt-2">
          <span>↗</span> {trend}
        </div>
      )}
    </div>
  );
}
