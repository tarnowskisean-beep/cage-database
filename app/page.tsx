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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <div style={{ color: 'hsl(var(--color-text-muted))' }}>Loading Analytics...</div>
      </div>
    );
  }

  if (!stats) return null;

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

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <DashboardCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon="💰"
          trend="+12% from last month"
        />
        <DashboardCard
          title="Active Batches"
          value={stats.byClient?.length || '0'}
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
                  formatter={(value: number) => formatCurrency(value)}
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
