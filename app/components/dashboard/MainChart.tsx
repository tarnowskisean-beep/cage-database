import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '@/types/dashboard';

interface MainChartProps {
    data: ChartDataPoint[];
    metric: 'amount' | 'count';
    setMetric: (m: 'amount' | 'count') => void;
}

export default function MainChart({ data, metric, setMetric }: MainChartProps) {
    return (
        <div className="lg:col-span-2 glass-panel p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-display text-white">
                    {metric === 'amount' ? 'Revenue Trend' : 'Volume Trend'}
                </h3>
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
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
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
                            tickFormatter={(val) => metric === 'amount' ? `$${val / 1000}k` : val.toLocaleString()}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#18181b',
                                borderColor: '#27272a',
                                color: '#fff',
                                fontSize: '12px'
                            }}
                            cursor={{ stroke: 'white', strokeWidth: 1, strokeDasharray: '4 4' }}
                            formatter={(value: any, name: any) => metric === 'amount' ? [`$${value.toLocaleString()}`, 'Revenue'] : [value.toLocaleString(), 'Count']}
                        />
                        <Area
                            type="monotone"
                            dataKey={metric}
                            stroke="#ffffff"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorVolume)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
