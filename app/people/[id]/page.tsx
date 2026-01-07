'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import TasksSection from './TasksSection';
import FilesSection from './FilesSection';

export default function PeopleProfile({ params }: { params: Promise<{ id: string }> }) {
    const [donorId, setDonorId] = useState<string>('');
    useEffect(() => { params.then(p => setDonorId(p.id)); }, [params]);

    const [donor, setDonor] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [pledges, setPledges] = useState<any[]>([]);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    // Modals State
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showAddPledge, setShowAddPledge] = useState(false);

    // Sidebar/Tabs
    const [activeTab, setActiveTab] = useState<'notes' | 'tasks' | 'files'>('notes');

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [clientFilter, setClientFilter] = useState('All');
    const [methodFilter, setMethodFilter] = useState('All');
    const [campaignFilter, setCampaignFilter] = useState('All');

    // Derived Lists for Dropdowns
    const uniqueClients = Array.from(new Set(history.map(h => h.ClientCode).filter(Boolean))).sort();
    const uniqueMethods = Array.from(new Set(history.map(h => h.GiftMethod || 'Check').filter(Boolean))).sort();
    const uniqueCampaigns = Array.from(new Set(history.map(h => h.CampaignID).filter(Boolean))).sort();

    // Filter Logic
    const filteredHistory = history.filter(h => {
        const d = h.GiftDate.substring(0, 10);
        const matchDate = (!startDate || d >= startDate) && (!endDate || d <= endDate);
        const matchClient = clientFilter === 'All' || h.ClientCode === clientFilter;
        const matchMethod = methodFilter === 'All' || (h.GiftMethod || 'Check') === methodFilter;
        const matchCampaign = campaignFilter === 'All' || h.CampaignID === campaignFilter;
        return matchDate && matchClient && matchMethod && matchCampaign;
    });

    const fetchData = () => {
        if (!donorId) return;
        fetch(`/api/people/${donorId}`)
            .then(res => res.json())
            .then(data => {
                setDonor(data.profile || data.donor);
                setStats(data.stats);
                setHistory(data.history || []);
                setPledges(data.pledges || []);
                setIsSubscribed(data.isSubscribed || false); // Set initial sub state
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, [donorId]);

    const handleSubscribe = async () => {
        try {
            const res = await fetch(`/api/people/${donorId}/subscribe`, { method: 'POST' });
            const data = await res.json();
            setIsSubscribed(data.subscribed);
        } catch (error) {
            console.error('Subscription failed', error);
        }
    };

    // Calculate Recency in Days
    const getDaysAgo = (dateStr: string | null) => {
        if (!dateStr) return 'Never';
        const diff = new Date().getTime() - new Date(dateStr).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return days === 0 ? 'Today' : `${days} days ago`;
    };

    // Prepare Chart Data (Fixed for Recharts)
    const chartData = history.reduce((acc: any[], curr: any) => {
        const year = String(new Date(curr.GiftDate).getFullYear()); // Ensure year is string for categorical axis
        const existing = acc.find(x => x.name === year);
        if (existing) {
            existing.amount += Number(curr.GiftAmount);
        } else {
            acc.push({ name: year, amount: Number(curr.GiftAmount) });
        }
        return acc;
    }, []).sort((a: any, b: any) => Number(a.name) - Number(b.name));


    if (loading) return null;
    if (!donor) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-display text-white mb-2">Donor Not Found</h2>
                <p className="text-gray-400 mb-4">The requested donor profile could not be located.</p>
                <Link href="/people" className="btn-secondary">Return to Directory</Link>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8 relative">

            {/* Breadcrumb */}
            <nav className="mb-6">
                <Link href="/people" className="text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                    &larr; Back to Directory
                </Link>
            </nav>

            {/* Profile Header Card */}
            <div className="glass-panel p-8 mb-8 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                    {/* Avatar */}
                    <div className="w-24 h-24 rounded-full bg-zinc-800 border-2 border-zinc-700 text-white flex items-center justify-center font-display text-3xl shadow-lg shrink-0 overflow-hidden relative">
                        {donor.ProfilePictureUrl ? (
                            <img src={donor.ProfilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span>{donor.FirstName?.[0]}{donor.LastName?.[0]}</span>
                        )}
                        {/* Camera Icon Overlay (Optional, could link to edit) */}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-4xl font-display text-white mb-2">{donor.FirstName} {donor.LastName}</h1>

                                {/* Bio / Staffer Info */}
                                <div className="mb-4">
                                    {donor.Bio && <p className="text-gray-300 text-sm italic max-w-2xl mb-2">"{donor.Bio}"</p>}
                                    <div className="flex items-center gap-4 text-xs">
                                        <span className={`px-2 py-0.5 rounded border ${donor.AssignedStafferName ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                            Assigned to: <span className="font-bold">{donor.AssignedStafferName || 'Unassigned'}</span>
                                        </span>
                                    </div>
                                    {donor.HasAlert && (
                                        <div className="mt-2 bg-red-500/20 border border-red-500/50 text-red-100 px-3 py-2 rounded text-sm font-bold flex items-center gap-2 animate-pulse">
                                            <span>🚨 PRIORITY ALERT:</span>
                                            <span className="font-normal text-red-200">{donor.AlertMessage}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Recency Indicators */}
                                <div className="flex gap-4 text-xs font-bold uppercase tracking-wider mt-1">
                                    <span className={`${stats.avgGift > 0 && getDaysAgo(history[0]?.GiftDate).includes('days') && parseInt(getDaysAgo(history[0]?.GiftDate)) < 90 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                        Last Gift: {getDaysAgo(history[0]?.GiftDate)}
                                    </span>
                                    <span className="text-gray-600">|</span>
                                    <span className="text-gray-400">
                                        Last Contact: {getDaysAgo(stats.lastContact)}
                                    </span>
                                </div>
                            </div>

                            {/* Subscription Bell */}
                            <button
                                onClick={handleSubscribe}
                                className={`p-2 rounded-full border transition-colors ${isSubscribed ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                title={isSubscribed ? "Alerts Enabled" : "Enable Alerts"}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                                    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                                    {isSubscribed && <circle cx="17" cy="5" r="3" fill="#34d399" stroke="none" />}
                                </svg>
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-6 text-sm text-gray-400 mt-4">
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">✉️</span>
                                {donor.Email || 'No Email'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">📞</span>
                                {donor.Phone || 'No Phone'}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white">📍</span>
                                {donor.City ? `${donor.City}, ${donor.State}` : 'No Location'}
                            </div>
                        </div>
                    </div>

                    {/* Quick Action */}
                    <div className="flex gap-2">
                        <a href={`/api/people/${donorId}/export`} target="_blank" className="btn-secondary">
                            Export History
                        </a>
                        <button
                            onClick={() => setShowEditProfile(true)}
                            className="btn-primary"
                        >
                            Edit Profile
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Impact Card */}
                <div className="glass-panel p-8 relative overflow-hidden group">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 relative z-10">Lifetime Value</p>
                    <p className="text-5xl font-display text-white mt-2 relative z-10 font-medium">
                        ${Number(stats.totalGiven || 0).toLocaleString()}
                    </p>
                    <div className="mt-4 text-sm text-gray-400 relative z-10 border-t border-white/5 pt-4 flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wider font-bold text-gray-600">Since {new Date(donor.CreatedAt).getFullYear()}</span>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wide">
                            Active Donor
                        </div>
                    </div>
                </div>

                {/* Stats Card */}
                <div className="glass-panel p-8 flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-8 text-center divide-x divide-white/5">
                        <div>
                            <p className="text-3xl font-display text-white font-medium">{stats.giftCount}</p>
                            <p className="text-xs text-gray-400 uppercase tracking-widest mt-2 font-bold">Total Gifts</p>
                        </div>
                        <div>
                            <p className="text-3xl font-display text-white font-medium">${Number(stats.avgGift || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            <p className="text-xs text-gray-400 uppercase tracking-widest mt-2 font-bold">Avg Gift</p>
                        </div>
                    </div>
                </div>

                {/* Chart Card */}
                <div className="glass-panel p-6 flex flex-col justify-center">
                    <div className="mb-4 flex justify-between items-center">
                        <p className="text-sm font-bold text-white uppercase tracking-widest">Yearly Giving</p>
                    </div>
                    <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                                <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', fontSize: '12px', color: '#fff' }}
                                />
                                <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
                                    {chartData.map((e, i) => (
                                        <Cell key={i} fill="#ffffff" fillOpacity={0.9} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Pledge Tracking Section */}
            <div className="glass-panel p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-display text-white">Pledge Tracking</h3>
                    <button
                        onClick={() => setShowAddPledge(true)}
                        className="text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded transition-colors uppercase tracking-wider font-bold"
                    >
                        + Add Pledge
                    </button>
                </div>
                {pledges.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pledges.map((pledge: any) => (
                            <div key={pledge.PledgeID} className="bg-white/5 p-4 rounded border border-white/5">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="text-sm font-medium text-white">{pledge.CampaignID}</p>
                                        <p className="text-xs text-gray-400 uppercase tracking-widest">Campaign</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-white">${Number(pledge.donated).toLocaleString()} / ${Number(pledge.Amount).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="w-full bg-zinc-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${Math.min(pledge.progress, 100)}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-right">
                                    <span className={`text-xs font-bold ${pledge.progress >= 100 ? 'text-emerald-400' : 'text-gray-400'}`}>
                                        {pledge.progress.toFixed(1)}% Fulfilled
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm italic">No active pledges tracked.</p>
                )}
            </div>


            {/* TABS: Notes, Tasks, Files */}
            <div className="mb-8">
                <div className="flex gap-4 mb-4 border-b border-white/10 pb-1">
                    <button onClick={() => setActiveTab('notes')} className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'notes' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-white'}`}>
                        Notes
                    </button>
                    <button onClick={() => setActiveTab('tasks')} className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'tasks' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-white'}`}>
                        Tasks ({stats.pendingTasks || 0})
                    </button>
                    <button onClick={() => setActiveTab('files')} className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'files' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-500 hover:text-white'}`}>
                        Files
                    </button>
                </div>

                {activeTab === 'notes' && (
                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-display text-white mb-4">Notes & Activity</h3>
                        <div className="space-y-3 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
                            <NotesList donorId={donorId} />
                        </div>
                        <AddNoteForm donorId={donorId} />
                    </div>
                )}
                {activeTab === 'tasks' && <TasksSection donorId={donorId} />}
                {activeTab === 'files' && <FilesSection donorId={donorId} />}
            </div>

            {/* Timeline / History Table */}
            <div className="glass-panel overflow-hidden">
                <div className="px-8 py-6 border-b border-[var(--glass-border)] bg-white/5 flex flex-col md:flex-row justify-between items-end gap-4">
                    <h3 className="text-lg font-display text-white">Donation Timeline</h3>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="date"
                            className="bg-black/20 border border-white/10 rounded px-3 py-1 text-sm text-gray-300 focus:outline-none focus:border-white/30"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                        />
                        <span className="text-gray-400 self-center">-</span>
                        <input
                            type="date"
                            className="bg-black/20 border border-white/10 rounded px-3 py-1 text-sm text-gray-300 focus:outline-none focus:border-white/30"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                        />
                        <select
                            className="bg-black/20 border border-white/10 rounded px-3 py-1 text-sm text-gray-300 focus:outline-none focus:border-white/30"
                            value={clientFilter}
                            onChange={e => setClientFilter(e.target.value)}
                        >
                            <option value="All">All Clients</option>
                            {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                            className="bg-black/20 border border-white/10 rounded px-3 py-1 text-sm text-gray-300 focus:outline-none focus:border-white/30"
                            value={methodFilter}
                            onChange={e => setMethodFilter(e.target.value)}
                        >
                            <option value="All">All Methods</option>
                            {uniqueMethods.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select
                            className="bg-black/20 border border-white/10 rounded px-3 py-1 text-sm text-gray-300 focus:outline-none focus:border-white/30"
                            value={campaignFilter}
                            onChange={e => setCampaignFilter(e.target.value)}
                        >
                            <option value="All">All Campaigns</option>
                            {uniqueCampaigns.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="px-8 py-4">Date</th>
                                <th className="px-6 py-4">Client</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Campaign</th>
                                <th className="px-6 py-4">Designation</th>
                                <th className="px-6 py-4 text-center">Batch</th>
                                <th className="px-6 py-4 text-center">Ack</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-12 text-center text-gray-400 italic">No donation history matches filters.</td>
                                </tr>
                            ) : (
                                filteredHistory.map((h: any) => (
                                    <tr key={h.DonationID} className="group hover:bg-white/5 transition-colors">
                                        <td className="px-8 py-4 text-gray-300 font-mono text-xs">
                                            {new Date(h.GiftDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-white font-medium">
                                            {h.ClientCode || h.ClientName}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400">
                                            {h.GiftMethod || 'Check'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {h.CampaignID ? (
                                                <span className="text-gray-300 font-medium">{h.CampaignID}</span>
                                            ) : (
                                                <span className="text-gray-600 text-[10px] uppercase tracking-wider font-bold">General</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-300">
                                            {/* Designation Editable Cell */}
                                            <div className="group/edit relative flex items-center gap-2">
                                                <span>{h.Designation || '-'}</span>
                                                <button
                                                    onClick={() => {
                                                        const newVal = prompt("Update Designation:", h.Designation || '');
                                                        if (newVal !== null && newVal !== h.Designation) {
                                                            fetch(`/api/donations/${h.DonationID}`, {
                                                                method: 'PUT',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ Designation: newVal })
                                                            }).then(() => fetchData());
                                                        }
                                                    }}
                                                    className="opacity-0 group-hover/edit:opacity-100 text-gray-500 hover:text-white transition-opacity"
                                                    title="Edit Designation"
                                                >
                                                    ✎
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="bg-zinc-800 border border-zinc-700 text-gray-400 px-2 py-0.5 rounded text-[10px] font-mono tracking-wide">
                                                    #{h.BatchID}
                                                </span>
                                                {h.ResolutionStatus !== 'Pending' && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm('Flag this donation for resolution?')) return;
                                                            await fetch(`/api/donations/${h.DonationID}/flag`, { method: 'POST' });
                                                            fetchData();
                                                        }}
                                                        className="text-[10px] text-gray-600 hover:text-yellow-500 transition-colors opacity-0 group-hover:opacity-100 uppercase tracking-wider font-bold"
                                                        title="Flag as Ambiguous"
                                                    >
                                                        🚩 Flag
                                                    </button>
                                                )}
                                                {h.ResolutionStatus === 'Pending' && (
                                                    <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">
                                                        ⚠️ Pending
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center flex gap-1 justify-center">
                                            <button
                                                title={`Thank You: ${h.ThankYouSentAt ? 'Sent' : 'Pending'}`}
                                                className={`w-6 h-6 rounded flex items-center justify-center border ${h.ThankYouSentAt ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-gray-600 hover:text-gray-400'}`}
                                                onClick={async () => {
                                                    await fetch(`/api/donations/${h.DonationID}/ack`, { method: 'PUT', body: JSON.stringify({ type: 'ThankYou', status: !h.ThankYouSentAt }) });
                                                    fetchData(); // Simplest refresh
                                                }}
                                            >
                                                T
                                            </button>
                                            <button
                                                title={`Tax Receipt: ${h.TaxReceiptSentAt ? 'Sent' : 'Pending'}`}
                                                className={`w-6 h-6 rounded flex items-center justify-center border ${h.TaxReceiptSentAt ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-white/5 border-white/10 text-gray-600 hover:text-gray-400'}`}
                                                onClick={async () => {
                                                    await fetch(`/api/donations/${h.DonationID}/ack`, { method: 'PUT', body: JSON.stringify({ type: 'TaxReceipt', status: !h.TaxReceiptSentAt }) });
                                                    fetchData();
                                                }}
                                            >
                                                R
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-white font-medium">
                                            ${Number(h.GiftAmount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {showEditProfile && (
                <EditProfileModal
                    donor={donor}
                    onClose={() => setShowEditProfile(false)}
                    onSave={() => { setShowEditProfile(false); fetchData(); }}
                />
            )}

            {showAddPledge && (
                <AddPledgeModal
                    donorId={donorId}
                    campaigns={uniqueCampaigns}
                    onClose={() => setShowAddPledge(false)}
                    onSave={() => { setShowAddPledge(false); fetchData(); }}
                />
            )}

        </div>
    );
}

// ... NotesList and AddNoteForm Components (Unchanged) ...
function NotesList({ donorId }: { donorId: string }) {
    const [notes, setNotes] = useState<any[]>([]);

    useEffect(() => {
        if (!donorId) return;
        const fetchNotes = () => {
            fetch(`/api/people/${donorId}/notes`)
                .then(res => res.json())
                .then(setNotes)
                .catch(console.error);
        };
        fetchNotes();
        // Keep simple polling
        const interval = setInterval(fetchNotes, 5000);
        return () => clearInterval(interval);
    }, [donorId]);

    if (notes.length === 0) return <p className="text-gray-400 text-xs uppercase tracking-widest py-2">No notes recorded yet.</p>;

    return (
        <div className="space-y-3">
            {notes.map(note => (
                <div key={note.NoteID} className="bg-white/5 p-4 rounded border border-white/5 hover:border-white/10 transition-colors">
                    <p className="text-gray-200 text-sm">{note.Content}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                        <span>{note.AuthorName}</span>
                        <span>{new Date(note.CreatedAt).toLocaleString()}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function AddNoteForm({ donorId }: { donorId: string }) {
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        setSubmitting(true);
        try {
            await fetch(`/api/people/${donorId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            setContent('');
        } catch (e) {
            alert('Failed to add note');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-3">
            <input
                type="text"
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Type a new note..."
                className="input-field flex-1"
            />
            <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
            >
                Post Note
            </button>
        </form>
    );
}

// --- NEW MODALS ---

function EditProfileModal({ donor, onClose, onSave }: any) {
    const [formData, setFormData] = useState({
        FirstName: donor.FirstName || '',
        LastName: donor.LastName || '',
        Email: donor.Email || '',
        Phone: donor.Phone || '',
        Address: donor.Address || '',
        City: donor.City || '',
        State: donor.State || '',
        Zip: donor.Zip || '',

        Bio: donor.Bio || '',
        AssignedStafferID: donor.AssignedStafferID || '',
        AlertMessage: donor.AlertMessage || '',
        HasAlert: donor.HasAlert || false
    });
    const [saving, setSaving] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        // Fetch users for dropdown
        fetch('/api/users').then(res => res.json()).then(data => {
            if (Array.isArray(data)) setUsers(data);
        }).catch(() => { });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            let profilePicKey = donor.ProfilePicture;

            // Handle Profile Picture Upload if new file selected
            const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
            if (fileInput?.files?.[0]) {
                const file = fileInput.files[0];
                const fd = new FormData();
                fd.append('file', file);
                fd.append('type', 'ProfilePicture');

                const uploadRes = await fetch(`/api/people/${donor.DonorID}/files`, { method: 'POST', body: fd });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    if (uploadData.file && uploadData.file.StorageKey) {
                        profilePicKey = uploadData.file.StorageKey;
                    }
                }
            }

            // Submit Profile Data
            await fetch(`/api/people/${donor.DonorID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, ProfilePicture: profilePicKey })
            });
            onSave();
        } catch (error) {
            console.error(error);
            alert('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-zinc-700 flex justify-between items-center bg-zinc-800/50">
                    <h3 className="text-xl font-display text-white">Edit Profile</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1">First Name</label>
                            <input className="input-field w-full" value={formData.FirstName} onChange={e => setFormData({ ...formData, FirstName: e.target.value })} required />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1">Last Name</label>
                            <input className="input-field w-full" value={formData.LastName} onChange={e => setFormData({ ...formData, LastName: e.target.value })} required />
                        </div>
                    </div>

                    {/* Profile Picture Input */}
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Profile Picture</label>
                        <input
                            type="file"
                            id="avatar-upload"
                            accept="image/*"
                            className="text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20"
                        />
                    </div>

                    {/* Bio & Assigned Staffer */}
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Bio</label>
                        <textarea
                            className="input-field w-full h-20"
                            value={formData.Bio}
                            onChange={e => setFormData({ ...formData, Bio: e.target.value })}
                            placeholder="Donor background..."
                        />
                    </div>

                    {/* Donor Alert Section */}
                    <div className="bg-red-500/10 border border-red-500/30 p-3 rounded">
                        <div className="flex items-center gap-2 mb-2">
                            <input
                                type="checkbox"
                                id="hasAlert"
                                checked={formData.HasAlert}
                                onChange={e => setFormData({ ...formData, HasAlert: e.target.checked })}
                                className="w-4 h-4 accent-red-500"
                            />
                            <label htmlFor="hasAlert" className="text-sm font-bold text-red-400 cursor-pointer uppercase tracking-wider">
                                Enable High-Priority Alert
                            </label>
                        </div>
                        {formData.HasAlert && (
                            <textarea
                                className="input-field w-full h-20 border-red-500/30 focus:border-red-500"
                                value={formData.AlertMessage}
                                onChange={e => setFormData({ ...formData, AlertMessage: e.target.value })}
                                placeholder="Alert Message (e.g. VIP Donor, Do Not Call)..."
                            />
                        )}
                    </div>

                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Assigned Staffer</label>
                        <select
                            className="input-field w-full"
                            value={formData.AssignedStafferID}
                            onChange={e => setFormData({ ...formData, AssignedStafferID: e.target.value })}
                        >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                                <option key={u.UserID} value={u.UserID}>{u.Username} ({u.Email})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1">Email</label>
                            <input className="input-field w-full" type="email" value={formData.Email} onChange={e => setFormData({ ...formData, Email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1">Phone</label>
                            <input className="input-field w-full" value={formData.Phone} onChange={e => setFormData({ ...formData, Phone: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Street Address</label>
                        <input className="input-field w-full" value={formData.Address} onChange={e => setFormData({ ...formData, Address: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1">City</label>
                            <input className="input-field w-full" value={formData.City} onChange={e => setFormData({ ...formData, City: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1">State</label>
                            <input className="input-field w-full" value={formData.State} onChange={e => setFormData({ ...formData, State: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs uppercase text-gray-500 mb-1">Zip</label>
                            <input className="input-field w-full" value={formData.Zip} onChange={e => setFormData({ ...formData, Zip: e.target.value })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={saving} className="btn-primary">
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}


function AddPledgeModal({ donorId, campaigns, onClose, onSave }: any) {
    const [amount, setAmount] = useState('');
    const [isNewCampaign, setIsNewCampaign] = useState(false);
    const [campaign, setCampaign] = useState(campaigns[0] || '');
    const [customCampaign, setCustomCampaign] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const finalCampaign = isNewCampaign ? customCampaign : campaign;

        if (!finalCampaign) {
            alert('Please select or enter a campaign');
            setSubmitting(false);
            return;
        }

        try {
            await fetch(`/api/people/${donorId}/pledges`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Amount: amount, CampaignID: finalCampaign })
            });
            onSave();
        } catch (error) {
            console.error(error);
            alert('Failed to add pledge');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-lg shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-700 flex justify-between items-center bg-zinc-800/50">
                    <h3 className="text-lg font-display text-white">Add Pledge</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs uppercase text-gray-500">Target Campaign</label>
                            <button
                                type="button"
                                onClick={() => setIsNewCampaign(!isNewCampaign)}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wide"
                            >
                                {isNewCampaign ? 'Select Existing' : '+ Enter New'}
                            </button>
                        </div>

                        {isNewCampaign ? (
                            <input
                                type="text"
                                className="input-field w-full"
                                value={customCampaign}
                                onChange={e => setCustomCampaign(e.target.value)}
                                placeholder="Enter campaign code (e.g. FALL24)"
                                required={isNewCampaign}
                                autoFocus
                            />
                        ) : (
                            <select
                                className="input-field w-full"
                                value={campaign}
                                onChange={e => setCampaign(e.target.value)}
                                required={!isNewCampaign}
                            >
                                <option value="" disabled>Select a Campaign</option>
                                {campaigns.map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                        <p className="text-[10px] text-gray-500 mt-1">Pledges track progress against a specific Mail Code.</p>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">Pledge Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                                type="number"
                                className="input-field w-full pl-8 font-mono text-white placeholder-gray-600"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="any"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
                        <button type="submit" disabled={submitting} className="btn-primary">
                            {submitting ? 'Creating...' : 'Create Pledge'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

