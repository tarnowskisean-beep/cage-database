"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');
    const [history, setHistory] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'history') {
            fetch('/api/import/history')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setHistory(data);
                    } else {
                        console.error('History API Error:', data);
                        setHistory([]);
                    }
                })
                .catch(err => {
                    console.error('Failed to load history:', err);
                    setHistory([]);
                });
        }
    }, [activeTab]);

    const handleRevert = async (id: number) => {
        if (!confirm('CAUTION: This will permanently DELETE all Batches and Donations created by this import. Are you sure?')) return;
        try {
            const res = await fetch(`/api/import/revert/${id}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                alert(`Reverted! Deleted ${data.deletedDonations} donations.`);
                // Refresh
                fetch('/api/import/history').then(r => r.json()).then(setHistory);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (e) { alert('Network error'); }
    };

    const [step, setStep] = useState<1 | 2 | 3>(1); // 1=Upload, 2=Processing, 3=Review
    const [file, setFile] = useState<File | null>(null);
    const [source, setSource] = useState('Winred');
    const [sessionId, setSessionId] = useState<number | null>(null);
    const [uploadMetrics, setUploadMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [availableSources, setAvailableSources] = useState<string[]>([]);

    // Staging Data
    const [stagingRows, setStagingRows] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClientId, setSelectedClientId] = useState<number | ''>('');

    // Quick Map State
    const [missingRules, setMissingRules] = useState(false);
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [quickMappings, setQuickMappings] = useState<Record<string, string>>({}); // Header -> Target
    const [savingRules, setSavingRules] = useState(false);

    // Load Clients and Sources on Mount
    // FIX: Use useEffect to avoid running fetch during server-side prerendering
    useEffect(() => {
        fetch('/api/clients').then(res => res.json()).then(data => setClients(data));
        fetch('/api/import/sources').then(res => res.json()).then(data => setAvailableSources(data));
    }, []);

    const handleCommit = async () => {
        if (!sessionId || !selectedClientId) return;
        if (!confirm('This will create a new Batch and insert all valid records. Continue?')) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/import/commit/${sessionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId: selectedClientId })
            });
            const data = await res.json();

            if (res.ok) {
                alert(`Success! Created Batch: ${data.batchCode}`);
                router.push(`/batches/${data.batchId}/enter`);
            } else {
                alert('Commit Failed: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Commit Error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', source);

        try {
            const res = await fetch('/api/import/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setSessionId(data.sessionId);
                setUploadMetrics(data);
                setStep(2); // Move to Process Step
            } else {
                alert('Upload Failed: ' + data.error);
            }
        } catch (err) {
            console.error(err);
            alert('Upload Error');
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async () => {
        if (!sessionId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/import/process/${sessionId}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                // Fetch Staging Data for Review
                const dataRes = await fetch(`/api/import/staging/${sessionId}`);
                const rows = await dataRes.json();
                setStagingRows(rows);
                setStep(3);
            } else {
                alert('Processing Failed: ' + (data.error || res.statusText));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Check for existing rules when entering Step 2
    useEffect(() => {
        if (step === 2 && source && sessionId) {
            checkRules();
        }
    }, [step, source, sessionId]);

    const checkRules = async () => {
        try {
            const res = await fetch(`/api/settings/mappings?source=${encodeURIComponent(source)}`);
            const rules = await res.json();
            // Check if there are ANY rules specific to this source
            const specificRules = rules.filter((r: any) => r.source_system === source);

            if (specificRules.length === 0) {
                setMissingRules(true);
                fetchHeaders();
            } else {
                setMissingRules(false);
            }
        } catch (e) { console.error(e); }
    };

    const fetchHeaders = async () => {
        try {
            // Re-using staging endpoint. Optimization: Creating a dedicated 'preview' endpoint would be better for large files.
            const res = await fetch(`/api/import/staging/${sessionId}`);
            const rows = await res.json();
            if (rows.length > 0) {
                const firstRow = rows[0].source_row_data || {};
                const headers = Object.keys(firstRow);
                setCsvHeaders(headers);

                // Initialize mappings with exact matches (case-insensitive)
                const initialMap: Record<string, string> = {};
                const commonTargets = ['Gift Date', 'Gift Amount', 'First Name', 'Last Name', 'External Batch ID'];

                headers.forEach(h => {
                    const normalized = h.toLowerCase().replace(/_/g, ' ');
                    const match = commonTargets.find(t => t.toLowerCase() === normalized);
                    if (match) initialMap[h] = match;
                });
                setQuickMappings(initialMap);
            }
        } catch (e) { console.error(e); }
    };

    const handleSaveMappings = async () => {
        setSavingRules(true);
        try {
            // Convert quick mappings to Rules
            const newRules = Object.entries(quickMappings).map(([header, target]) => ({
                source_system: source,
                source_column: header,
                target_column: target,
                is_active: true,
                default_value: null,
                transformation_rule: null
            }));

            // Also add a default "Gift Platform" rule
            // newRules.push({ source_column: null, target_column: 'Gift Platform', default_value: 'Online', ... });

            for (const rule of newRules) {
                await fetch('/api/settings/mappings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(rule)
                });
            }

            setMissingRules(false);
            alert('Mappings saved! You can now run normalization.');
        } catch (e) {
            console.error(e);
            alert('Failed to save mappings.');
        } finally {
            setSavingRules(false);
        }
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>Import Wizard</h1>

            {/* Top Navigation */}
            <div className="tab-nav" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
                <button
                    className={`btn-secondary ${activeTab === 'wizard' ? 'active-tab' : ''}`}
                    style={activeTab === 'wizard' ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}}
                    onClick={() => setActiveTab('wizard')}
                >
                    🧙 Import Wizard
                </button>
                <button
                    className={`btn-secondary ${activeTab === 'history' ? 'active-tab' : ''}`}
                    style={activeTab === 'history' ? { background: 'var(--color-primary)', color: 'white', borderColor: 'var(--color-primary)' } : {}}
                    onClick={() => setActiveTab('history')}
                >
                    📜 History & Revert
                </button>
            </div>

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className="glass-panel">
                    <h2 style={{ marginBottom: '1rem' }}>Import History</h2>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>System</th>
                                <th>Status</th>
                                <th>Created By</th>
                                <th>Batches</th>
                                <th>Donations</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>No history found</td></tr>}
                            {history.map(h => (
                                <tr key={h.id}>
                                    <td>{new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString()}</td>
                                    <td>{h.source_system}</td>
                                    <td>
                                        <span className={`badge ${h.status === 'Completed' ? 'badge-success' : h.status === 'Reverted' ? 'badge-error' : 'badge-neutral'}`}>
                                            {h.status}
                                        </span>
                                    </td>
                                    <td>{h.CreatedByName || 'Unknown'}</td>
                                    <td>{h.BatchesCreated}</td>
                                    <td>{h.DonationsCreated}</td>
                                    <td>
                                        {h.status === 'Completed' && (
                                            <button
                                                className="btn-secondary"
                                                style={{ color: 'var(--color-error)', borderColor: 'var(--color-error)', fontSize: '0.8rem', padding: '0.2rem 0.5rem' }}
                                                onClick={() => handleRevert(h.id)}
                                            >
                                                Undo / Revert
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* WIZARD TAB */}
            {activeTab === 'wizard' && (
                <>
                    {/* Steps Indicator */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                        <StepBadge num={1} active={step === 1} label="Upload CSV" />
                        <StepBadge num={2} active={step === 2} label="Normalize Data" />
                        <StepBadge num={3} active={step === 3} label="Review & Commit" />
                    </div>

                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Select File Source</h3>
                            <form onSubmit={handleUpload}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <CreatableSelect
                                        label="Source System"
                                        value={source}
                                        options={availableSources}
                                        onChange={setSource}
                                        placeholder="Enter Source Name (e.g. PayPal)"
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>CSV File</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="input-field"
                                        style={{ padding: '1rem' }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ width: '100%' }}
                                    disabled={!file || loading}
                                >
                                    {loading ? 'Uploading...' : 'Start Import'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Processing */}
                    {step === 2 && (
                        <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
                                <h3 style={{ marginBottom: '1rem' }}>Processing Data</h3>
                                <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
                                    Uploaded <strong>{uploadMetrics?.rowCount}</strong> rows from <strong>{source}</strong>.
                                </p>
                            </div>

                            {missingRules ? (
                                <div style={{ background: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-warning)' }}>
                                        <span>⚠️</span>
                                        <strong>Configuration Required</strong>
                                    </div>
                                    <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                        This appears to be a new source. Please map the CSV columns to the database fields below.
                                    </p>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', fontWeight: 600, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                        <div>CSV Header</div>
                                        <div>Target Field</div>
                                    </div>

                                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                                        {csvHeaders.map(header => (
                                            <div key={header} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                <code style={{ fontSize: '0.85rem' }}>{header}</code>
                                                <select
                                                    className="input-field"
                                                    value={quickMappings[header] || ''}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        const newMap = { ...quickMappings };
                                                        if (val) newMap[header] = val;
                                                        else delete newMap[header];
                                                        setQuickMappings(newMap);
                                                    }}
                                                    style={{ padding: '0.4rem' }}
                                                >
                                                    <option value="">-- Ignore --</option>
                                                    <optgroup label="Transaction Data">
                                                        <option value="Gift Date">Gift Date</option>
                                                        <option value="Gift Amount">Gift Amount</option>
                                                        <option value="Gift Fee">Gift Fee</option>
                                                        <option value="Gift Platform">Gift Platform</option>
                                                        <option value="Gift Method">Gift Method</option>
                                                        <option value="Transaction Type">Transaction Type</option>
                                                        <option value="Check Number">Check Number</option>
                                                        <option value="Secondary ID">Secondary ID (Source ID)</option>
                                                    </optgroup>
                                                    <optgroup label="Donor Data">
                                                        <option value="First Name">First Name</option>
                                                        <option value="Last Name">Last Name</option>
                                                        <option value="Address">Address</option>
                                                        <option value="City">City</option>
                                                        <option value="State">State</option>
                                                        <option value="Zip">Zip</option>
                                                        <option value="Email">Email</option>
                                                        <option value="Phone">Phone</option>
                                                        <option value="Employer">Employer</option>
                                                        <option value="Occupation">Occupation</option>
                                                    </optgroup>
                                                    <optgroup label="System">
                                                        <option value="External Batch ID">External Batch ID</option>
                                                        <option value="Yes Inactive">Yes Inactive</option>
                                                    </optgroup>
                                                </select>
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleSaveMappings}
                                        className="btn-primary"
                                        style={{ width: '100%' }}
                                        disabled={savingRules || Object.keys(quickMappings).length === 0}
                                    >
                                        {savingRules ? 'Saving...' : 'Save Mappings & Continue'}
                                    </button>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <p style={{ marginBottom: '2rem' }}>Ready to apply normalization rules.</p>
                                    <button
                                        onClick={handleProcess}
                                        className="btn-primary"
                                        disabled={loading}
                                    >
                                        {loading ? 'Processing Rules...' : 'Run Normalization'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3>Review Data</h3>

                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 500 }}>Assign to Client</label>
                                        <select
                                            className="input-field"
                                            style={{ padding: '0.5rem' }}
                                            value={selectedClientId}
                                            onChange={e => setSelectedClientId(Number(e.target.value))}
                                        >
                                            <option value="">Select Client...</option>
                                            {clients.map(c => (
                                                <option key={c.ClientID} value={c.ClientID}>{c.ClientName} ({c.ClientCode})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        onClick={handleCommit}
                                        className="btn-primary"
                                        disabled={loading || !selectedClientId}
                                        style={{ height: '42px', marginTop: 'auto' }}
                                    >
                                        {loading ? 'Committing...' : 'Commit to Database'}
                                    </button>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ overflowX: 'auto', padding: '0' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Status</th>
                                            <th>First Name</th>
                                            <th>Last Name</th>
                                            <th>Amount</th>
                                            <th>Defaults Applied</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stagingRows.map((row: any) => {
                                            const data = row.normalized_data || {};
                                            return (
                                                <tr key={row.id}>
                                                    <td>
                                                        <span style={{
                                                            color: row.validation_status === 'Valid' ? '#4ade80' : '#ef4444',
                                                            fontWeight: 600
                                                        }}>
                                                            {row.validation_status}
                                                        </span>
                                                    </td>
                                                    <td>{data['First Name'] || '-'}</td>
                                                    <td>{data['Last Name'] || '-'}</td>
                                                    <td>{data['Gift Amount'] || '-'}</td>
                                                    <td>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '300px' }}>
                                                            {row.defaults_applied?.join(', ')}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Reusable Component for Select + Custom Entry
function CreatableSelect({ label, value, options, onChange, placeholder = "Select or Type..." }: { label: string, value: string, options: string[], onChange: (val: string) => void, placeholder?: string }) {
    const isCustom = value && !options.includes(value);
    const [mode, setMode] = useState<'select' | 'input'>(isCustom ? 'input' : 'select');

    return (
        <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>{label}</label>
            {mode === 'select' ? (
                <select
                    className="input-field"
                    value={options.includes(value) ? value : ''}
                    onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                            setMode('input');
                            onChange('');
                        } else {
                            onChange(e.target.value);
                        }
                    }}
                >
                    <option value="" disabled>Select Source...</option>
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    <option style={{ fontWeight: 600, color: 'var(--color-primary)' }} value="__NEW__">+ Add New Source...</option>
                </select>
            ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        className="input-field"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={placeholder}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => { setMode('select'); onChange(options[0] || ''); }}
                        style={{ padding: '0 1rem', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                        title="Cancel custom entry"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}

function StepBadge({ num, active, label }: { num: number, active: boolean, label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: active ? 1 : 0.5 }}>
            <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: active ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
            }}>
                {num}
            </div>
            <span style={{ fontWeight: 500 }}>{label}</span>
        </div>
    );
}
