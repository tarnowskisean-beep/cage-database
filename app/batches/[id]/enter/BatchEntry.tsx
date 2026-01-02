"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Link from 'next/link';

interface DonationRecord {
    DonationID: number;
    GiftAmount: number;
    SecondaryID?: string; // Check Number
    ScanString?: string;
    CreatedAt: string;
    GiftMethod: string;
    GiftType: string;
}

// Dropdown Options (Matched to Create Modal)
const METHODS = ['Check', 'Cash', 'Credit Card', 'Chargeback', 'EFT', 'Stock', 'Crypto'];
const PLATFORMS = ['Chainbridge', 'Stripe', 'National Capital', 'City National', 'Propay', 'Anedot', 'Winred', 'Cage', 'Import'];
const GIFT_TYPES = ['Individual/Trust/IRA', 'Corporate', 'Foundation', 'Donor-Advised Fund'];

export default function BatchEntry({ id }: { id: string }) {
    const [isMounted, setIsMounted] = useState(false);
    const [batch, setBatch] = useState<any>(null);
    const [records, setRecords] = useState<DonationRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        amount: '',
        checkNumber: '',
        scanString: '',
        method: '',
        platform: '',
        giftType: '',
        year: '',
        quarter: ''
    });

    const [donorInfo, setDonorInfo] = useState({
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        state: '',
        zip: ''
    });

    const [saving, setSaving] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<number | null>(null);

    // Refs
    const scanRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);

    // --- DATA FETCHING ---
    const fetchBatch = async () => {
        try {
            const res = await fetch(`/api/batches/${id}`);
            if (res.ok) {
                const data = await res.json();
                setBatch(data);
                // Initialize form defaults
                setFormData(prev => ({
                    ...prev,
                    method: data.DefaultGiftMethod || 'Check',
                    platform: data.DefaultGiftPlatform || 'Cage',
                    giftType: data.DefaultGiftType || 'Individual/Trust/IRA',
                    year: data.DefaultGiftYear?.toString() || new Date().getFullYear().toString(),
                    quarter: data.DefaultGiftQuarter || 'Q1'
                }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchRecords = async () => {
        try {
            const res = await fetch(`/api/batches/${id}/donations`);
            if (res.ok) {
                const data = await res.json();
                setRecords(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        setIsMounted(true);
        if (id) {
            Promise.all([fetchBatch(), fetchRecords()]).finally(() => setLoading(false));
        }
    }, [id]);

    // --- HANDLERS ---

    const handleScanLookup = () => {
        const raw = formData.scanString; // Don't trim immediately, tabs are significant
        if (!raw) return;

        // --- SMART DETECTION LOGIC ---

        // METHOD B: Datamatrix (Direct Data) - Detects TABS
        // Format: MailCode \t ACCT# \t Pre \t First \t Mi \t Last \t Suffix \t Add1 \t Add2 \t City \t State \t Zip
        if (raw.includes('\t')) {
            console.log("Detected: Datamatrix (Method B - Direct Parse)");
            const parts = raw.split('\t');

            // Map fields based on user spec (1-indexed in spec, 0-indexed here)
            // 0: MailCode, 1: ACCT#, 2: Prefix, 3: First, 4: Middle, 5: Last, 6: Suffix
            // 7: Add1, 8: Add2, 9: City, 10: State, 11: Zip

            setDonorInfo({
                firstName: parts[3] || '',
                lastName: parts[5] || '',
                address: (parts[7] || '') + (parts[8] ? ' ' + parts[8] : ''), // Combine Add1 + Add2
                city: parts[9] || '',
                state: parts[10] || '',
                zip: parts[11] || ''
            });

            // Use ACCT# as check number or reference? User said "ACCT#", likely internal ID.
            // Using MailCode or ACCT# as reference
            const refId = parts[1] || parts[0];
            setFormData(prev => ({
                ...prev,
                checkNumber: refId || prev.checkNumber
            }));

            // Note: Method B spec didn't explicitly say "Amount" is in the string, 
            // unlike my previous guess. So we leave Amount blank for manual entry.

        } else {
            // METHOD A: Barcode (CagingID Lookup)
            // Format: "CagingID" (or "Client Mailer CagingID...")
            console.log("Detected: Barcode (Method A - Lookup)");

            // Mock API Lookup for CagingID
            // In production: await fetch(`/api/lookup/${raw}`)
            setDonorInfo({
                firstName: 'John',
                lastName: 'Doe',
                address: '123 Caging Lookup Blvd',
                city: 'Alexandria',
                state: 'VA',
                zip: '22314'
            });
        }

        // Always move focus to amount to continue flow
        amountRef.current?.focus();
    };

    const handleSave = async () => {
        if (!formData.amount) {
            alert("Amount is required");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                amount: parseFloat(formData.amount),
                checkNumber: formData.checkNumber,
                scanString: formData.scanString,
                giftMethod: formData.method,
                giftPlatform: formData.platform,
                giftType: formData.giftType,
                giftYear: parseInt(formData.year),
                giftQuarter: formData.quarter
            };

            const res = await fetch(`/api/batches/${id}/donations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newRecord = await res.json();
                setLastSavedId(newRecord.DonationID);
                await fetchRecords();

                // Clear ONLY transaction specific fields, keep defaults
                setFormData(prev => ({
                    ...prev,
                    amount: '',
                    checkNumber: '',
                    scanString: ''
                }));
                setDonorInfo({ firstName: '', lastName: '', address: '', city: '', state: '', zip: '' });

                // Refocus
                scanRef.current?.focus();
            } else {
                alert('Failed to save');
            }
        } catch (e) {
            console.error(e);
            alert('Error saving');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        }
    };

    if (!isMounted || loading) return <div className="p-8 text-slate-400">Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: '-2rem', width: 'calc(100% + 4rem)', background: '#1e293b' }}>

            {/* 1. TOP BAR (Batch Defaults Context) */}
            <div style={{
                height: '80px',
                background: '#334155',
                borderBottom: '1px solid #475569',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.5rem',
                justifyContent: 'space-between',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link href="/batches" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>&larr; Exit</Link>
                    <div>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Batch</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{batch?.BatchCode || id}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>Client</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{batch?.ClientCode || '...'}</div>
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>TOTAL</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#4ade80' }}>
                        ${records.reduce((sum, r) => sum + Number(r.GiftAmount), 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Count: {records.length}</div>
                </div>
            </div>

            {/* 2. MAIN CONTENT SPLIT */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* LEFT: FORM (Fixed Width) */}
                <div style={{
                    width: '450px',
                    background: '#0f172a',
                    borderRight: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.5rem',
                    gap: '1.5rem',
                    overflowY: 'auto'
                }}>

                    {/* Search / Scan Block */}
                    <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.5rem' }}>SCAN / LOOKUP CHECK</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                ref={scanRef}
                                className="input-field"
                                style={{ flex: 1, fontFamily: 'monospace' }}
                                placeholder="Scan Data..."
                                value={formData.scanString}
                                onChange={e => setFormData({ ...formData, scanString: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleScanLookup()}
                                autoFocus
                            />
                            <button className="btn-primary" style={{ padding: '0.5rem 1rem' }} onClick={handleScanLookup}>Search</button>
                        </div>
                    </div>

                    {/* Donor Info (Read Only) */}
                    <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>DONOR INFORMATION</div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle}>First Name</label>
                                <input className="input-field" disabled value={donorInfo.firstName} style={disabledInputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Last Name</label>
                                <input className="input-field" disabled value={donorInfo.lastName} style={disabledInputStyle} />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Address</label>
                            <input className="input-field" disabled value={donorInfo.address} style={{ ...disabledInputStyle, marginBottom: '0.5rem' }} />
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input className="input-field" disabled value={donorInfo.city} style={{ ...disabledInputStyle, flex: 2 }} />
                                <input className="input-field" disabled value={donorInfo.state} style={{ ...disabledInputStyle, flex: 1 }} />
                                <input className="input-field" disabled value={donorInfo.zip} style={{ ...disabledInputStyle, flex: 1 }} />
                            </div>
                        </div>
                    </div>

                    {/* Transaction Details (Editable) */}
                    <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155', flex: 1 }}>
                        <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>TRANSACTION DETAILS</div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 2fr', gap: '0.75rem', alignItems: 'center' }}>

                            <label style={labelStyle}>Platform</label>
                            <select
                                className="input-field"
                                value={formData.platform}
                                onChange={e => setFormData({ ...formData, platform: e.target.value })}
                            >
                                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>

                            <label style={labelStyle}>Type</label>
                            <select
                                className="input-field"
                                value={formData.giftType}
                                onChange={e => setFormData({ ...formData, giftType: e.target.value })}
                            >
                                {GIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>

                            <label style={labelStyle}>Method</label>
                            <select
                                className="input-field"
                                value={formData.method}
                                onChange={e => setFormData({ ...formData, method: e.target.value })}
                            >
                                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>

                            <div style={{ height: '1px', background: '#334155', gridColumn: 'span 2', margin: '0.5rem 0' }}></div>

                            <label style={labelStyle}>Gift Year</label>
                            <input
                                className="input-field"
                                type="number"
                                value={formData.year}
                                onChange={e => setFormData({ ...formData, year: e.target.value })}
                            />

                            <label style={labelStyle}>Gift Quarter</label>
                            <select
                                className="input-field"
                                value={formData.quarter}
                                onChange={e => setFormData({ ...formData, quarter: e.target.value })}
                            >
                                <option value="Q1">Q1</option>
                                <option value="Q2">Q2</option>
                                <option value="Q3">Q3</option>
                                <option value="Q4">Q4</option>
                            </select>

                            <div style={{ height: '1px', background: '#334155', gridColumn: 'span 2', margin: '0.5rem 0' }}></div>

                            <label style={labelStyle}>Check #</label>
                            <input
                                className="input-field"
                                value={formData.checkNumber}
                                onChange={e => setFormData({ ...formData, checkNumber: e.target.value })}
                            />

                            <label style={{ ...labelStyle, color: '#4ade80', fontWeight: 600 }}>Gift Amount</label>
                            <input
                                ref={amountRef}
                                className="input-field"
                                type="number"
                                placeholder="0.00"
                                style={{ fontSize: '1.1rem', fontWeight: 600 }}
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                onKeyDown={handleKeyDown}
                            />

                        </div>

                        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                            <button
                                className="btn-primary"
                                style={{ flex: 1, background: '#334155', border: '1px solid #475569' }}
                                onClick={() => {
                                    // Reset Fields
                                    setFormData({
                                        ...formData,
                                        amount: '',
                                        checkNumber: '',
                                        scanString: ''
                                    });
                                    setDonorInfo({ firstName: '', lastName: '', address: '', city: '', state: '', zip: '' });
                                    scanRef.current?.focus();
                                }}
                            >
                                Reset
                            </button>
                            <button
                                className="btn-primary"
                                style={{ flex: 2 }}
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? "Saving..." : "Save Record"}
                            </button>
                        </div>
                    </div>

                </div>

                {/* RIGHT: DATA GRID */}
                <div style={{ flex: 1, background: '#020617', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#1e293b', color: '#94a3b8', textAlign: 'left', fontWeight: 500 }}>
                            <tr>
                                <th style={thStyle}>ID</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Method</th>
                                <th style={thStyle}>Check #</th>
                                <th style={thStyle}>Year/Q</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.DonationID} style={{
                                    borderBottom: '1px solid #1e293b',
                                    background: r.DonationID === lastSavedId ? 'rgba(74, 222, 128, 0.1)' : 'transparent'
                                }}>
                                    <td style={tdStyle}>{r.DonationID}</td>
                                    <td style={tdStyle}>{r.GiftType || '-'}</td>
                                    <td style={tdStyle}>{r.GiftMethod}</td>
                                    <td style={tdStyle}>{r.SecondaryID || '-'}</td>
                                    <td style={tdStyle}>{r.CreatedAt.substring(0, 4)}</td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#e2e8f0' }}>${Number(r.GiftAmount).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}

const labelStyle = {
    display: 'block',
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginBottom: 0
};

const disabledInputStyle = {
    background: '#334155',
    color: '#94a3b8',
    borderColor: 'transparent',
    cursor: 'not-allowed'
};

const thStyle = {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #334155'
};

const tdStyle = {
    padding: '0.5rem 1rem',
    color: '#cbd5e1'
};
