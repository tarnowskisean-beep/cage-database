"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type MappingRule = {
    id: number;
    source_system: string;
    source_column: string | null;
    target_column: string;
    default_value: string | null;
    transformation_rule: string | null;
    is_active: boolean;
};

export default function MappingsPage() {
    const [rules, setRules] = useState<MappingRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSource, setFilterSource] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState<MappingRule | null>(null);

    // Fetch Rules
    const fetchRules = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterSource) params.append('source', filterSource);
            const res = await fetch(`/api/settings/mappings?${params.toString()}`);
            if (res.ok) {
                setRules(await res.json());
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
        // eslint-disable-next-line
    }, [filterSource]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        await fetch(`/api/settings/mappings?id=${id}`, { method: 'DELETE' });
        fetchRules();
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1>Import Mappings</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Configure logic for applying defaults to imported data.</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => { setEditingRule(null); setShowModal(true); }}
                >+ Add Rule</button>
            </div>

            {/* Filters */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <select
                    className="input-field"
                    style={{ width: '200px' }}
                    value={filterSource}
                    onChange={e => setFilterSource(e.target.value)}
                >
                    <option value="">All Sources</option>
                    <option value="Winred">Winred</option>
                    <option value="Stripe">Stripe</option>
                    <option value="Anedot">Anedot</option>
                    <option value="Cage">Cage</option>
                    <option value="*">Global Defaults (*)</option>
                </select>
            </div>

            {/* Rules Table */}
            <div className="glass-panel" style={{ padding: '0' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Source System</th>
                            <th>Source Column</th>
                            <th>Target Column</th>
                            <th>Default Value</th>
                            <th>Transform</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                        ) : rules.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No rules found.</td></tr>
                        ) : (
                            rules.map(rule => (
                                <tr key={rule.id}>
                                    <td>
                                        <span style={{
                                            fontWeight: 600,
                                            color: rule.source_system === '*' ? 'var(--color-primary)' : 'inherit'
                                        }}>
                                            {rule.source_system}
                                        </span>
                                    </td>
                                    <td>
                                        {rule.source_column ? (
                                            <code>{rule.source_column}</code>
                                        ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>-</span>}
                                    </td>
                                    <td>{rule.target_column}</td>
                                    <td>
                                        {rule.default_value ? (
                                            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>
                                                {rule.default_value}
                                            </code>
                                        ) : <span style={{ color: 'var(--color-text-muted)' }}>-</span>}
                                    </td>
                                    <td>{rule.transformation_rule || '-'}</td>
                                    <td>
                                        <span style={{
                                            color: rule.is_active ? '#4ade80' : 'var(--color-text-muted)',
                                            fontWeight: 500
                                        }}>
                                            {rule.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => { setEditingRule(rule); setShowModal(true); }}
                                                style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                                            >Edit</button>
                                            <button
                                                onClick={() => handleDelete(rule.id)}
                                                style={{ padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }}
                                            >🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <RuleModal
                    rule={editingRule}
                    onClose={() => setShowModal(false)}
                    onSave={() => { setShowModal(false); fetchRules(); }}
                />
            )}
        </div>
    );
}

function RuleModal({ rule, onClose, onSave }: { rule: MappingRule | null, onClose: () => void, onSave: () => void }) {
    const [formData, setFormData] = useState({
        source_system: rule?.source_system || 'Winred',
        source_column: rule?.source_column || '',
        target_column: rule?.target_column || '',
        default_value: rule?.default_value || '',
        transformation_rule: rule?.transformation_rule || '',
        is_active: rule?.is_active ?? true
    });
    const [saving, setSaving] = useState(false);

    // Common Target Columns (Suggestion List)
    const targetOptions = [
        'Gift Type', 'Gift Method', 'Gift Platform', 'Gift Amount',
        'Gift Date', 'Gift Year', 'Gift Quarter',
        'First Name', 'Last Name', 'Address', 'City', 'State', 'Zip',
        'Yes Inactive', 'External Batch ID'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const method = rule ? 'PUT' : 'POST';
            const body = rule ? { ...formData, id: rule.id } : formData;

            const res = await fetch('/api/settings/mappings', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                onSave();
            } else {
                alert('Failed to save rule');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div className="glass-panel" style={{ width: '500px', padding: '2rem', backgroundColor: 'var(--color-bg-surface)' }}>
                <h3 style={{ marginBottom: '1.5rem' }}>{rule ? 'Edit Rule' : 'Add New Rule'}</h3>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    <div>
                        <CreatableSelect
                            label="Source System"
                            value={formData.source_system}
                            options={['Winred', 'Stripe', 'Anedot', 'Cage', '*']}
                            onChange={val => setFormData({ ...formData, source_system: val })}
                            placeholder="Enter Source Name"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Source Column (from CSV)</label>
                        <input
                            className="input-field"
                            value={formData.source_column}
                            onChange={e => setFormData({ ...formData, source_column: e.target.value })}
                            placeholder="e.g. amount (Leave empty for default-only rules)"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Target Column (Database)</label>
                        <input
                            list="targets"
                            className="input-field"
                            value={formData.target_column}
                            onChange={e => setFormData({ ...formData, target_column: e.target.value })}
                            placeholder="e.g. Gift Amount"
                            required
                        />
                        <datalist id="targets">
                            {targetOptions.map(t => <option key={t} value={t} />)}
                        </datalist>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Default Value (If Empty)</label>
                        <input
                            className="input-field"
                            value={formData.default_value}
                            onChange={e => setFormData({ ...formData, default_value: e.target.value })}
                            placeholder="e.g. Online Source"
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Transform (Optional)</label>
                        <select
                            className="input-field"
                            value={formData.transformation_rule}
                            onChange={e => setFormData({ ...formData, transformation_rule: e.target.value })}
                        >
                            <option value="">None</option>
                            <option value="uppercase">Uppercase</option>
                            <option value="trim">Trim Whitespace</option>
                            <option value="date_format">Date Format (YYYY-MM-DD)</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                            id="is_active"
                        />
                        <label htmlFor="is_active">Rule Active</label>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Rule'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-border)', color: 'white', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
