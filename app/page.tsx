"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface Stats {
  totalRevenue: number;
  byClient: { ClientName: string; total: number }[];
  byMethod: { GiftMethod: string; count: string; total: number }[]; // count comes as string from Postgres usually
  byPlatform: { GiftPlatform: string; count: string; total: number }[];
}

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [clients, setClients] = useState<{ ClientID: number, ClientName: string, ClientCode: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate default weekly range (Sat -> Fri)
  const getWeeklyRange = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 6 is Saturday

    // Find most recent Saturday
    const diff = (day + 1) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - diff);

    // End is start + 6 days (Friday)
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    return {
      start: formatDate(start),
      end: formatDate(end)
    };
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

  // Don't show full loading screen on filter change to allow smoother UX, just show opacity or spinner if needed
  // But for now, we'll keep it simple.

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-display text-white mb-2">
          Dashboard
        </h1>
        <p className="text-gray-400">Real-time donation insights and performance metrics</p>
      </header>

      {/* Filter Bar */}
      <div className="glass-panel p-4 mb-8 flex flex-wrap gap-4 items-center bg-[#1a1a1a]">
        <div className="flex items-center gap-2 text-gray-400">
          <span className="text-xl">🔍</span>
          <span className="font-semibold text-sm uppercase tracking-wide">Filters:</span>
        </div>

        <select
          className="bg-[#111] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none min-w-[200px]"
          value={filters.clientId}
          onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs uppercase font-bold">From</span>
          <input
            type="date"
            className="bg-[#111] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            onMouseOver={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch (err) {
                // Ignore errors if browser doesn't support showPicker or blocks it
              }
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs uppercase font-bold">To</span>
          <input
            type="date"
            className="bg-[#111] border border-gray-700 text-white rounded px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            onMouseOver={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch (err) { }
            }}
          />
        </div>

        {(filters.clientId || filters.startDate || filters.endDate) && (
          <button
            onClick={() => setFilters({ clientId: '', startDate: '', endDate: '' })}
            className="text-red-400 text-sm hover:text-red-300 transition-colors ml-auto"
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && !stats ? (
        <div className="h-64 flex items-center justify-center text-gray-500 animate-pulse">
          Loading Data...
        </div>
      ) : (stats as any).error ? (
        <div className="p-8 text-red-500 text-center border border-red-900 bg-red-900/10 rounded">
          Error loading dashboard: {(stats as any).error}
        </div>
      ) : !stats ? null : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon="💰"
              trend="+12% vs last month"
            />
            <DashboardCard
              title="Total Donations"
              value={stats.byMethod ? stats.byMethod.reduce((acc, curr) => acc + parseInt(curr.count), 0).toLocaleString() : '0'}
              icon="🎁"
            />
            <DashboardCard
              title="Active Batches"
              value={(stats.byClient?.length || 0).toString()}
              icon="📂"
            />
            <DashboardCard
              title="Avg Donation"
              value={stats.totalRevenue && stats.byMethod ? formatCurrency(stats.totalRevenue / stats.byMethod.reduce((acc, curr) => acc + parseInt(curr.count), 0)) : '$0.00'}
              icon="📈"
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

            {/* Revenue by Client */}
            <div className="glass-panel p-6 bg-[#1a1a1a]">
              <h3 className="text-lg font-display text-white mb-6">Revenue by Client</h3>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byClient} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis type="number" stroke="#666" tickFormatter={(val) => `$${val}`} />
                    <YAxis
                      dataKey="ClientName"
                      type="category"
                      stroke="#999"
                      width={150}
                      tick={{ fontSize: 12, fill: '#999' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }}
                      formatter={(value: number | undefined) => formatCurrency(value || 0)}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="total" fill="var(--color-accent)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="glass-panel p-6 bg-[#1a1a1a]">
              <h3 className="text-lg font-display text-white mb-6">Payment Methods</h3>
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platforms */}
            <div className="glass-panel p-6 bg-[#1a1a1a] lg:col-span-2">
              <h3 className="text-lg font-display text-white mb-6">Platform Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byPlatform} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis type="number" stroke="#666" />
                    <YAxis dataKey="GiftPlatform" type="category" stroke="#999" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/batches" className="glass-panel p-6 border border-gray-800 hover:border-[var(--color-accent)] transition-colors group bg-[#1a1a1a]">
              <h3 className="text-[var(--color-accent)] font-bold mb-2 group-hover:translate-x-1 transition-transform inline-block">Go to Batches &rarr;</h3>
              <p className="text-gray-400 text-sm">Manage checking and donation batches</p>
            </Link>
            <Link href="/search" className="glass-panel p-6 border border-gray-800 hover:border-[var(--color-accent)] transition-colors group bg-[#1a1a1a]">
              <h3 className="text-white font-bold mb-2 group-hover:translate-x-1 transition-transform inline-block">Export Reports &rarr;</h3>
              <p className="text-gray-400 text-sm">Generate CSV exports via Search</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardCard({ title, value, icon, trend }: { title: string, value: string, icon: string, trend?: string }) {
  return (
    <div className="glass-panel p-6 bg-[#1a1a1a]">
      <div className="flex justify-between items-start mb-2">
        <div className="text-gray-400 font-medium text-sm">{title}</div>
        <div className="text-2xl opacity-50">{icon}</div>
      </div>
      <div className="text-3xl font-display text-white font-bold mb-1">
        {value}
      </div>
      {trend && (
        <div className="text-[var(--color-accent)] text-xs flex items-center gap-1 font-bold">
          <span>↗</span> {trend}
        </div>
      )}
    </div>
  );
}
