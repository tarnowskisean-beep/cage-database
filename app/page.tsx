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

  const [filters, setFilters] = useState({
    clientId: '',
    startDate: '',
    endDate: ''
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
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', background: 'linear-gradient(to right, #4ade80, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Executive Dashboard
        </h1>
        <p style={{ color: 'hsl(var(--color-text-muted))' }}>Real-time donation insights and performance metrics</p>
      </header>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🔍</span>
          <span style={{ fontWeight: 600, color: 'hsl(var(--color-text-muted))' }}>Filters:</span>
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
          <span style={{ color: 'hsl(var(--color-text-muted))', fontSize: '0.875rem' }}>From</span>
          <input
            type="date"
            className="input-field"
            style={{ width: 'auto' }}
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: 'hsl(var(--color-text-muted))', fontSize: '0.875rem' }}>To</span>
          <input
            type="date"
            className="input-field"
            style={{ width: 'auto' }}
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>

        {(filters.clientId || filters.startDate || filters.endDate) && (
          <button
            onClick={() => setFilters({ clientId: '', startDate: '', endDate: '' })}
            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {loading && !stats ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <div style={{ color: 'hsl(var(--color-text-muted))' }}>Loading Data...</div>
        </div>
      ) : (stats as any).error ? (
        <div style={{ padding: '2rem', color: '#ef4444', textAlign: 'center' }}>
          Error loading dashboard: {(stats as any).error}
        </div>
      ) : !stats ? null : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
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
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.byClient}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--color-border), 0.3)" />
                    <XAxis dataKey="ClientName" stroke="hsl(var(--color-text-muted))" />
                    <YAxis stroke="hsl(var(--color-text-muted))" tickFormatter={(val) => `$${val}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--color-bg-surface))', border: '1px solid hsl(var(--color-border))' }}
                      formatter={(value: number | undefined) => formatCurrency(value || 0)}
                    />
                    <Bar dataKey="total" fill="#4ade80" radius={[4, 4, 0, 0]} />
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
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--color-bg-surface))', border: '1px solid hsl(var(--color-border))' }} />
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
                    <CartesianGrid strokeDasharray="3 3" stroke="hsla(var(--color-border), 0.3)" />
                    <XAxis type="number" stroke="hsl(var(--color-text-muted))" />
                    <YAxis dataKey="GiftPlatform" type="category" stroke="hsl(var(--color-text-muted))" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--color-bg-surface))', border: '1px solid hsl(var(--color-border))' }} />
                    <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <Link href="/batches" className="glass-panel" style={{ padding: '1.5rem', flex: 1, textDecoration: 'none', color: 'inherit', border: '1px solid hsla(140, 60%, 40%, 0.3)' }}>
              <h3 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Go to Batches &rarr;</h3>
              <p style={{ color: 'hsl(var(--color-text-muted))' }}>Manage checking and donation batches</p>
            </Link>
            <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, opacity: 0.5 }}>
              <h3 style={{ marginBottom: '0.5rem' }}>Export Reports</h3>
              <p style={{ color: 'hsl(var(--color-text-muted))' }}>Coming soon</p>
            </div>
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
        <div style={{ color: 'hsl(var(--color-text-muted))', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: '1.5rem' }}>{icon}</div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: trend ? '0.5rem' : 0 }}>
        {value}
      </div>
      {trend && (
        <div style={{ color: '#4ade80', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span>↗</span> {trend}
        </div>
      )}
    </div>
  );
}
