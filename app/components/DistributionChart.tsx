'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface DistributionChartProps {
    title: string;
    data: { name: string; count: number; total: number }[];
    colors?: string[];
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function DistributionChart({ title, data, colors = DEFAULT_COLORS }: DistributionChartProps) {
    const [metric, setMetric] = useState<'amount' | 'count'>('amount');

    // Filter valid data
    const chartData = data
        .filter(d => metric === 'amount' ? d.total > 0 : d.count > 0)
        .map((d, i) => ({
            name: d.name || 'Unknown',
            value: metric === 'amount' ? d.total : d.count,
            count: d.count,
            total: d.total,
            color: colors[i % colors.length]
        }))
        .sort((a, b) => b.value - a.value);

    return (
        <div className="glass-panel p-6 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-display text-white">{title}</h3>
                <div className="flex gap-2 bg-zinc-900 border border-white/10 p-1 rounded-lg">
                    <button
                        onClick={() => setMetric('amount')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${metric === 'amount' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        $ Revenue
                    </button>
                    <button
                        onClick={() => setMetric('count')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${metric === 'count' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        # Volume
                    </button>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(255,255,255,0.1)" />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#18181b',
                                    borderColor: '#27272a',
                                    color: '#fff',
                                    fontSize: '12px',
                                    borderRadius: '8px'
                                }}
                                formatter={(value: any) => metric === 'amount'
                                    ? [`$${(value || 0).toLocaleString()}`, 'Revenue']
                                    : [(value || 0).toLocaleString(), 'Count']
                                }
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                formatter={(value) => <span className="text-xs text-gray-400 ml-1">{value}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm italic">
                        No data available
                    </div>
                )}
            </div>
        </div>
    );
}
