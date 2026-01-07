"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

type Rule = {
    RuleID: number;
    Name: string;
    Priority: number;
    IsActive: boolean;
    AssignToUserID: number;
    AssignedToUsername?: string;
    AmountMin?: number;
    AmountMax?: number;
    State?: string;
    ZipPrefix?: string;
    CampaignID?: string;
};

type User = {
    UserID: number;
    Username: string;
};

export default function AssignmentRulesPage() {
    const { data: session } = useSession();
    const [rules, setRules] = useState<Rule[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        priority: 0,
        assignToUserId: '',
        amountMin: '',
        amountMax: '',
        state: '',
        zipPrefix: '',
        campaignId: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [rulesRes, usersRes] = await Promise.all([
                fetch('/api/settings/assignment-rules'),
                fetch('/api/users')
            ]);

            if (rulesRes.ok) setRules(await rulesRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm('Area you sure you want to delete this rule?')) return;
        await fetch(`/api/settings/assignment-rules/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const handleToggleActive = async (rule: Rule) => {
        await fetch(`/api/settings/assignment-rules/${rule.RuleID}`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: !rule.IsActive })
        });
        fetchData();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/settings/assignment-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    priority: Number(formData.priority),
                    assignToUserId: Number(formData.assignToUserId),
                    amountMin: formData.amountMin ? Number(formData.amountMin) : null,
                    amountMax: formData.amountMax ? Number(formData.amountMax) : null,
                })
            });
            if (res.ok) {
                setShowModal(false);
                setFormData({
                    name: '', priority: 0, assignToUserId: '', amountMin: '', amountMax: '', state: '', zipPrefix: '', campaignId: ''
                });
                fetchData();
            } else {
                alert('Failed to save rule');
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Assignment Rules</h1>
                    <p className="text-gray-400">Manage automatic donation assignment rules.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    + New Rule
                </button>
            </div>

            <div className="bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-[var(--color-bg-base)] border-b border-[var(--color-border)] text-xs uppercase text-gray-500 font-medium">
                        <tr>
                            <th className="p-4 w-16 text-center">Pri</th>
                            <th className="p-4">Rule Name</th>
                            <th className="p-4">Criteria</th>
                            <th className="p-4">Assign To</th>
                            <th className="p-4 w-24 text-center">Status</th>
                            <th className="p-4 w-24 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {rules.map(rule => (
                            <tr key={rule.RuleID} className="hover:bg-[var(--color-bg-base)] transition-colors">
                                <td className="p-4 text-center text-gray-400 font-mono">{rule.Priority}</td>
                                <td className="p-4 font-medium">{rule.Name}</td>
                                <td className="p-4 text-sm text-gray-400">
                                    <div className="flex flex-wrap gap-2">
                                        {(rule.AmountMin || rule.AmountMax) && (
                                            <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                                                ${rule.AmountMin || 0} - ${rule.AmountMax || '∞'}
                                            </span>
                                        )}
                                        {rule.State && (
                                            <span className="bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/20">
                                                State: {rule.State}
                                            </span>
                                        )}
                                        {rule.ZipPrefix && (
                                            <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">
                                                Zip: {rule.ZipPrefix}*
                                            </span>
                                        )}
                                        {rule.CampaignID && (
                                            <span className="bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded border border-pink-500/20">
                                                Camp: {rule.CampaignID}
                                            </span>
                                        )}
                                        {!rule.AmountMin && !rule.AmountMax && !rule.State && !rule.ZipPrefix && !rule.CampaignID && (
                                            <span className="text-gray-600 italic">No specific criteria - Catch All?</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-200 flex items-center justify-center text-xs font-bold">
                                            {rule.AssignedToUsername?.slice(0, 2).toUpperCase()}
                                        </div>
                                        <span>{rule.AssignedToUsername}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => handleToggleActive(rule)}
                                        className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${rule.IsActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-500'}`}
                                    >
                                        {rule.IsActive ? 'Active' : 'Disabled'}
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <button
                                        onClick={() => handleDelete(rule.RuleID)}
                                        className="text-red-400 hover:text-red-300 transition-colors"
                                        title="Delete Rule"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {rules.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                    No assignment rules defined.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-[var(--color-bg-surface)] p-6 rounded-xl border border-[var(--color-border)] w-full max-w-lg shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">Create Assignment Rule</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Rule Name</label>
                                    <input
                                        required
                                        className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. High Value - West Coast"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Priority (0=High)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                                        value={formData.priority}
                                        onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Assign To User</label>
                                <select
                                    required
                                    className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded px-3 py-2 focus:outline-none focus:border-emerald-500 text-white"
                                    value={formData.assignToUserId}
                                    onChange={e => setFormData({ ...formData, assignToUserId: e.target.value })}
                                >
                                    <option value="">Select User...</option>
                                    {users.map(u => (
                                        <option key={u.UserID} value={u.UserID}>{u.Username}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="border-t border-[var(--color-border)] pt-4 mt-4">
                                <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Criteria (Optional)</h3>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Min Amount ($)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded px-3 py-2"
                                            value={formData.amountMin}
                                            onChange={e => setFormData({ ...formData, amountMin: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Max Amount ($)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded px-3 py-2"
                                            value={formData.amountMax}
                                            onChange={e => setFormData({ ...formData, amountMax: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">State Code</label>
                                        <input
                                            className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded px-3 py-2 uppercase"
                                            maxLength={2}
                                            placeholder="CA"
                                            value={formData.state}
                                            onChange={e => setFormData({ ...formData, state: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Zip Prefix</label>
                                        <input
                                            className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded px-3 py-2"
                                            placeholder="902"
                                            value={formData.zipPrefix}
                                            onChange={e => setFormData({ ...formData, zipPrefix: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Campaign ID</label>
                                        <input
                                            className="w-full bg-[var(--color-bg-base)] border border-[var(--color-border)] rounded px-3 py-2"
                                            value={formData.campaignId}
                                            onChange={e => setFormData({ ...formData, campaignId: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded font-bold shadow-lg shadow-emerald-500/20"
                                >
                                    Save Rule
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
