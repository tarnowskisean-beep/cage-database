"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
    const router = useRouter();
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

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>Import Wizard</h1>

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
                <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: '3rem' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
                    <h3 style={{ marginBottom: '1rem' }}>Ready to Process</h3>
                    <p style={{ marginBottom: '2rem', color: 'var(--color-text-muted)' }}>
                        Uploaded <strong>{uploadMetrics?.rowCount}</strong> rows from <strong>{source}</strong>.
                        We will now apply mapping rules and defaults.
                    </p>
                    <button
                        onClick={handleProcess}
                        className="btn-primary"
                        disabled={loading}
                    >
                        {loading ? 'Processing Rules...' : 'Run Normalization'}
                    </button>
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
