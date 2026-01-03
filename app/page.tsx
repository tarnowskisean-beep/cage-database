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
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Real-time donation insights and performance metrics</p>
      </header>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Filters:</span>
        </div>

        <select
          className="input-field"
          style={{ width: 'auto', minWidth: '200px' }}
          value={filters.clientId}
          onChange={(e) => setFilters(prev => ({ ...prev, clientId: e.target.value }))}
        >
          <option value="">All Clients</option>
          {clients.map(c => (
            <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>From</span>
          <input
            type="date"
            className="input-field"
            style={{ width: 'auto' }}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>To</span>
          <input
            type="date"
            className="input-field"
            style={{ width: 'auto' }}
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
            style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && !stats ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>Loading Data...</div>
        </div>
      ) : (stats as any).error ? (
        <div style={{ padding: '2rem', color: 'var(--color-error)', textAlign: 'center' }}>
          Error loading dashboard: {(stats as any).error}
        </div>
      ) : !stats ? null : (
        <>
          <div className="stats-grid">
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

            {/* Revenue by Client */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Revenue by Client</h3>
              <div style={{ height: '500px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byClient} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" stroke="var(--color-text-muted)" tickFormatter={(val) => `$${val}`} />
                    <YAxis
                      dataKey="ClientName"
                      type="category"
                      stroke="var(--color-text-muted)"
                      width={220}
                      tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)' }}
                      formatter={(value: number | undefined) => formatCurrency(value || 0)}
                    />
                    <Bar dataKey="total" fill="var(--color-active)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Payment Methods</h3>
              <div style={{ height: '300px' }}>
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
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Platforms */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Platform Distribution</h3>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byPlatform} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" stroke="var(--color-text-muted)" />
                    <YAxis dataKey="GiftPlatform" type="category" stroke="var(--color-text-muted)" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-main)' }} />
                    <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <Link href="/batches" className="glass-panel" style={{ padding: '1.5rem', flex: 1, textDecoration: 'none', color: 'inherit', border: '1px solid var(--color-border)' }}>
              <h3 style={{ color: 'var(--color-active)', marginBottom: '0.5rem' }}>Go to Batches &rarr;</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>Manage checking and donation batches</p>
            </Link>
            <Link href="/search" className="glass-panel" style={{ padding: '1.5rem', flex: 1, textDecoration: 'none', color: 'inherit', border: '1px solid var(--color-border)' }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Export Reports</h3>
              <p style={{ color: 'var(--color-text-muted)' }}>Generate CSV exports via Search</p>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardCard({ title, value, icon, trend }: { title: string, value: string, icon: string, trend?: string }) {
  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
        <div style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: trend ? '0.5rem' : 0 }}>
        {value}
      </div>
      {trend && (
        <div style={{ color: 'var(--color-active)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span>↗</span> {trend}
        </div>
      )}
    </div>
  );
}
