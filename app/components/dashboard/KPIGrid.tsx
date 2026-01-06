import { useRouter } from 'next/navigation';
import { DashboardStats } from '@/types/dashboard';

interface KPIGridProps {
    stats: DashboardStats | null;
}

export default function KPIGrid({ stats }: KPIGridProps) {
    const router = useRouter();

    return (
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
    );
}
