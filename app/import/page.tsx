"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { METHODS, PLATFORMS, GIFT_TYPES } from '@/lib/constants';

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
    useEffect(() => {
        const fetchClients = fetch('/api/clients', { cache: 'no-store' }).then(res => res.json());
        const fetchSources = fetch('/api/import/sources').then(res => res.json());

        Promise.all([fetchClients, fetchSources])
            .then(([clientsData, sourcesData]) => {
                setClients(Array.isArray(clientsData) ? clientsData : []);
                setAvailableSources(Array.isArray(sourcesData) ? sourcesData : []);
            })
            .catch(console.error);
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
        <div className="max-w-[1200px] mx-auto px-6 py-8">
            <header className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Data Management</h2>
                    <h1 className="text-4xl text-white font-display">Import Revenue</h1>
                </div>

                {/* Tab Switcher */}
                <div className="bg-zinc-900 border border-white/10 p-1 rounded-lg flex items-center">
                    <button
                        onClick={() => setActiveTab('wizard')}
                        className={`
                            px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-all
                            ${activeTab === 'wizard' ? 'bg-white text-black shadow' : 'text-gray-500 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        🧙 Wizard
                    </button>
                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`
                            px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-all
                            ${activeTab === 'history' ? 'bg-white text-black shadow' : 'text-gray-500 hover:text-white hover:bg-white/5'}
                        `}
                    >
                        📜 History
                    </button>
                </div>
            </header>

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
                <div className="glass-panel overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                        <h3 className="font-display text-lg text-white">Import History</h3>
                        <span className="text-xs text-gray-500 uppercase tracking-widest">{history.length} records</span>
                    </div>

                    {history.length === 0 ? (
                        <div className="py-24 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center text-3xl mb-4">
                                📭
                            </div>
                            <h3 className="text-white font-medium text-lg mb-2">No Import History Found</h3>
                            <p className="text-gray-500 max-w-sm mb-6">
                                You haven&apos;t imported any data yet. Start the wizard to import your first CSV file.
                            </p>
                            <button
                                onClick={() => setActiveTab('wizard')}
                                className="btn-primary"
                            >
                                Start Import Wizard
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table w-full">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 text-left">Date</th>
                                        <th className="px-6 py-3 text-left">System</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-left">Created By</th>
                                        <th className="px-6 py-3 text-right">Batches</th>
                                        <th className="px-6 py-3 text-right">Donations</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map(h => (
                                        <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-gray-300">
                                                <div className="font-mono text-xs text-gray-400 mb-1">
                                                    {new Date(h.created_at).toLocaleDateString()}
                                                </div>
                                                <div className="text-sm font-medium text-white">
                                                    {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-gray-300">
                                                    {h.source_system}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${h.status === 'Completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                        h.status === 'Reverted' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                            'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                                    }
                                                `}>
                                                    {h.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-300">{h.CreatedByName || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-right font-mono text-white">{h.BatchesCreated}</td>
                                            <td className="px-6 py-4 text-right font-mono text-white">{h.DonationsCreated}</td>
                                            <td className="px-6 py-4 text-right">
                                                {h.status === 'Completed' && (
                                                    <button
                                                        className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide hover:underline"
                                                        onClick={() => handleRevert(h.id)}
                                                    >
                                                        Undo Import
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* WIZARD TAB */}
            {activeTab === 'wizard' && (
                <div className="max-w-4xl mx-auto">
                    {/* Steps Indicator */}
                    <div className="flex justify-between items-center mb-10 relative">
                        <div className="absolute top-1/2 left-0 w-full h-px bg-white/10 -z-10"></div>
                        <StepBadge num={1} active={step >= 1} current={step === 1} label="Upload CSV" />
                        <StepBadge num={2} active={step >= 2} current={step === 2} label="Normalize" />
                        <StepBadge num={3} active={step >= 3} current={step === 3} label="Review & Commit" />
                    </div>

                    {/* Step 1: Upload */}
                    {step === 1 && (
                        <div className="glass-panel p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-8">
                                <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center text-xl mx-auto mb-4 border border-blue-500/20">
                                    📂
                                </div>
                                <h3 className="text-xl font-display text-white mb-2">Select Source & File</h3>
                                <p className="text-gray-500 text-sm">Upload a CSV export from your donation platform.</p>
                            </div>

                            <form onSubmit={handleUpload} className="max-w-md mx-auto space-y-6">
                                <div>
                                    <CreatableSelect
                                        label="Source System"
                                        value={source}
                                        options={availableSources}
                                        onChange={setSource}
                                        placeholder="E.g. Winred, ActBlue, Anedot..."
                                    />
                                </div>

                                <div className="group relative">
                                    <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-semibold group-hover:text-blue-400 transition-colors">
                                        CSV File
                                    </label>
                                    <div className="relative border-2 border-dashed border-white/10 rounded-lg p-8 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-center cursor-pointer">
                                        <input
                                            type="file"
                                            accept=".csv"
                                            onChange={e => setFile(e.target.files?.[0] || null)}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="pointer-events-none">
                                            {file ? (
                                                <div className="text-green-400 font-medium flex items-center justify-center gap-2">
                                                    <span>📄</span> {file.name}
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-sm">Drag & drop or Click to Browse</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full btn-primary py-4 text-base"
                                    disabled={!file || loading}
                                >
                                    {loading ? 'Uploading...' : 'Continue to Processing →'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Step 2: Processing */}
                    {step === 2 && (
                        <div className="glass-panel p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-10 border-b border-white/5 pb-8">
                                <div className="text-4xl mb-4 animate-spin-slow inline-block">⚙️</div>
                                <h3 className="text-xl font-display text-white mb-2">Processing Data</h3>
                                <p className="text-green-400 font-mono text-sm bg-green-400/10 inline-block px-3 py-1 rounded-full border border-green-400/20">
                                    Successfully processed {uploadMetrics?.rowCount} rows from {source}
                                </p>
                            </div>

                            {missingRules ? (
                                <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-6">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center text-xl flex-shrink-0">
                                            ⚠️
                                        </div>
                                        <div>
                                            <h4 className="text-orange-400 font-bold text-lg mb-1">Mapping Configuration Required</h4>
                                            <p className="text-orange-300/70 text-sm">
                                                This appears to be a new source. Please map the CSV columns to our database fields below.
                                                We'll save this configuration for next time.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-black/20 rounded-lg overflow-hidden border border-white/5">
                                        <div className="grid grid-cols-2 gap-4 px-4 py-3 bg-white/5 font-semibold text-xs text-gray-400 uppercase tracking-wider">
                                            <div>CSV Header</div>
                                            <div>Database Field</div>
                                        </div>

                                        <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                                            {csvHeaders.map(header => (
                                                <div key={header} className="grid grid-cols-2 gap-4 items-center">
                                                    <div className="font-mono text-sm text-gray-300 truncate" title={header}>{header}</div>
                                                    <select
                                                        className="input-field bg-zinc-900 border-white/10 text-sm py-1.5 focus:border-orange-500/50"
                                                        value={quickMappings[header] || ''}
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            const newMap = { ...quickMappings };
                                                            if (val) newMap[header] = val;
                                                            else delete newMap[header];
                                                            setQuickMappings(newMap);
                                                        }}
                                                    >
                                                        <option value="">-- Ignore Column --</option>
                                                        <optgroup label="Transaction Data">
                                                            <option value="Gift Date">Gift Date</option>
                                                            <option value="Gift Amount">Gift Amount</option>
                                                            <option value="Gift Fee">Gift Fee</option>
                                                            <option value="Gift Platform">Gift Platform</option>
                                                            <option value="Gift Method">Gift Method</option>
                                                            <option value="Transaction Type">Transaction Type</option>
                                                            <option value="Check Number">Check Number</option>
                                                            <option value="Secondary ID">Secondary ID</option>
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
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-white/5">
                                        <button
                                            onClick={handleSaveMappings}
                                            className="w-full btn-primary bg-orange-500 hover:bg-orange-600 border-orange-400"
                                            disabled={savingRules || Object.keys(quickMappings).length === 0}
                                        >
                                            {savingRules ? 'Saving Configuration...' : 'Save Mappings & Normalize →'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="max-w-md mx-auto bg-zinc-800/50 rounded-lg p-6 border border-white/5 mb-8">
                                        <p className="text-gray-300 mb-2">Configuration found! Ready to apply normalization rules.</p>
                                        <p className="text-xs text-gray-500">
                                            The system will automatically map columns based on saved settings for <span className="text-white font-bold">{source}</span>.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleProcess}
                                        className="btn-primary px-8 py-3 text-lg shadow-lg shadow-blue-500/20"
                                        disabled={loading}
                                    >
                                        {loading ? 'Processing...' : 'Run Normalization →'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Review */}
                    {step === 3 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col lg:flex-row justify-between items-end mb-6 gap-6">
                                <div>
                                    <h3 className="text-2xl font-display text-white mb-2">Review & Commit</h3>
                                    <p className="text-gray-400 text-sm">
                                        Review the normalized data below. If everything looks correct, select a client to assign this batch to.
                                    </p>
                                </div>

                                <div className="glass-panel p-4 flex gap-4 items-end bg-zinc-900 border-blue-500/30 shadow-lg shadow-blue-500/10">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] uppercase tracking-widest text-gray-500 mb-1 font-bold">Assign to Client</label>
                                        <select
                                            className="input-field bg-zinc-800 border-white/10 min-w-[200px]"
                                            value={selectedClientId}
                                            onChange={e => setSelectedClientId(Number(e.target.value))}
                                        >
                                            <option value="">Select Client...</option>
                                            {clients.map(c => (
                                                <option key={c.ClientID} value={c.ClientID}>{c.ClientCode} - {c.ClientName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button
                                        onClick={handleCommit}
                                        className="btn-primary h-[42px]"
                                        disabled={loading || !selectedClientId}
                                    >
                                        {loading ? 'Committing...' : 'Commit to Database'}
                                    </button>
                                </div>
                            </div>

                            <div className="glass-panel overflow-hidden p-0">
                                <div className="overflow-x-auto max-h-[600px]">
                                    <table className="data-table w-full">
                                        <thead className="sticky top-0 bg-zinc-900 z-10">
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
                                                            <span className={`
                                                                inline-flex items-center px-2 py-0.5 rounded textxs font-bold uppercase tracking-wide
                                                                ${row.validation_status === 'Valid'
                                                                    ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                                                                    : 'text-red-400 bg-red-400/10 border border-red-400/20'}
                                                            `}>
                                                                {row.validation_status}
                                                            </span>
                                                        </td>
                                                        <td className="text-white">{data['First Name'] || '-'}</td>
                                                        <td className="text-white">{data['Last Name'] || '-'}</td>
                                                        <td className="font-mono text-gray-300">{data['Gift Amount'] || '-'}</td>
                                                        <td>
                                                            {row.defaults_applied && row.defaults_applied.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {row.defaults_applied.map((d: string) => (
                                                                        <span key={d} className="text-[10px] px-1 bg-white/5 rounded text-gray-500 border border-white/5">{d}</span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-600 italic text-xs">None</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
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
        <div className="space-y-2">
            <label className="block text-xs uppercase tracking-widest text-gray-500 font-bold">{label}</label>
            {mode === 'select' ? (
                <div className="relative">
                    <select
                        className="input-field bg-zinc-900 border-white/10 w-full appearance-none"
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
                        <option className="font-bold text-blue-400 bg-blue-900/20" value="__NEW__">+ Add New Source...</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <input
                        className="input-field bg-zinc-900 border-white/10 w-full"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={placeholder}
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={() => { setMode('select'); onChange(options[0] || ''); }}
                        className="px-3 py-2 bg-zinc-800 border border-white/10 rounded hover:bg-zinc-700 transition-colors text-gray-400 hover:text-white"
                        title="Cancel custom entry"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}

function StepBadge({ num, active, current, label }: { num: number, active: boolean, current?: boolean, label: string }) {
    return (
        <div className={`flex flex-col items-center gap-2 relative z-10 ${active ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                ${current
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50 scale-110'
                    : active
                        ? 'bg-zinc-800 text-green-400 border border-green-500/50' // Completed state
                        : 'bg-zinc-900 text-gray-600 border border-zinc-800'
                }
            `}>
                {active && !current ? '✓' : num}
            </div>
            <span className={`
                font-medium tracking-wide uppercase text-[10px] transition-colors
                ${current ? 'text-blue-400' : active ? 'text-gray-300' : 'text-gray-600'}
            `}>
                {label}
            </span>
        </div>
    );
}
