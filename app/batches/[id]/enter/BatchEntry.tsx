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

            // Real API Lookup
            fetch(`/api/lookup/caging/${encodeURIComponent(raw)}`)
                .then(res => {
                    if (res.ok) return res.json();
                    throw new Error('Not Found');
                })
                .then(data => {
                    if (data.found && data.record) {
                        setDonorInfo({
                            firstName: data.record.FirstName || '',
                            lastName: data.record.LastName || '',
                            address: data.record.Address || '',
                            city: data.record.City || '',
                            state: data.record.State || '',
                            zip: data.record.Zip || ''
                        });
                        // Also set check number / scan string if needed
                        setFormData(prev => ({ ...prev, checkNumber: raw }));
                    }
                })
                .catch(() => {
                    alert('Barcode not found in Finder File');
                    // Optional: Clear donor info or leave as is
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: '-2rem', width: 'calc(100% + 4rem)', background: '#0f172a' }}>

            {/* 1. TOP HEADER (Minimal Info) */}
            <div style={{
                height: '60px',
                background: '#1e293b',
                borderBottom: '1px solid #334155',
                display: 'flex',
                alignItems: 'center',
                padding: '0 1.5rem',
                justifyContent: 'space-between',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <Link href="/batches" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>&larr;</span> Back
                    </Link>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>|</span>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{batch?.BatchCode}</span>
                        <span style={{ color: '#64748b' }}>/</span>
                        <span style={{ color: '#94a3b8' }}>{batch?.ClientCode}</span>
                    </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', gap: '2rem' }}>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '0.5rem' }}>COUNT</span>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{records.length}</span>
                    </div>
                    <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '0.5rem' }}>TOTAL</span>
                        <span style={{ fontWeight: 600, color: '#4ade80' }}>${records.reduce((sum, r) => sum + Number(r.GiftAmount), 0).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* 2. MAIN WORKSPACE (3 Columns) */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* COL 1: SETTINGS / DEFAULTS (Left Sidebar) */}
                <div style={{
                    width: '300px',
                    background: '#0f172a',
                    borderRight: '1px solid #334155',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem',
                    overflowY: 'auto'
                }}>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>BATCH DEFAULTS</div>

                    {/* Transaction Details (Editable - LOCKED UNTIL SCAN) */}
                    <div style={{
                        background: '#1e293b',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #334155',
                        flex: 1,
                        opacity: donorInfo.firstName ? 1 : 0.4,
                        pointerEvents: donorInfo.firstName ? 'auto' : 'none',
                        transition: 'opacity 0.2s'
                    }}>
                        <div style={{ color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem', borderBottom: '1px solid #334155', paddingBottom: '0.5rem' }}>
                            {donorInfo.firstName ? "2. TRANSACTION DETAILS" : "2. SCAN TO UNLOCK"}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) 2fr', gap: '0.75rem', alignItems: 'center' }}>

                            <label style={labelStyle}>Platform</label>
                            <select
                                className="input-field"
                                value={formData.platform}
                                onChange={e => setFormData({ ...formData, platform: e.target.value })}
                                disabled={!donorInfo.firstName}
                            >
                                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>

                            <label style={labelStyle}>Type</label>
                            <select
                                className="input-field"
                                value={formData.giftType}
                                onChange={e => setFormData({ ...formData, giftType: e.target.value })}
                                disabled={!donorInfo.firstName}
                            >
                                {GIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>

                            <label style={labelStyle}>Method</label>
                            <select
                                className="input-field"
                                value={formData.method}
                                onChange={e => setFormData({ ...formData, method: e.target.value })}
                                disabled={!donorInfo.firstName}
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
                                disabled={!donorInfo.firstName}
                            />

                            <label style={labelStyle}>Gift Quarter</label>
                            <select
                                className="input-field"
                                value={formData.quarter}
                                onChange={e => setFormData({ ...formData, quarter: e.target.value })}
                                disabled={!donorInfo.firstName}
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
                                disabled={!donorInfo.firstName}
                            />

                            <label style={{ ...labelStyle, color: donorInfo.firstName ? '#4ade80' : '#64748b', fontWeight: 600 }}>Gift Amount</label>
                            <input
                                ref={amountRef}
                                className="input-field"
                                type="number"
                                placeholder="0.00"
                                style={{
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    color: donorInfo.firstName ? '#4ade80' : '#64748b',
                                    borderColor: donorInfo.firstName ? '#4ade80' : '#334155'
                                }}
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                onKeyDown={handleKeyDown}
                                disabled={!donorInfo.firstName}
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
                                style={{ flex: 2, background: saving ? '#475569' : (donorInfo.firstName ? '#3b82f6' : '#334155') }}
                                onClick={handleSave}
                                disabled={saving || !donorInfo.firstName}
                            >
                                {saving ? "Saving..." : "Save Record"}
                            </button>
                        </div>
                    </div>

                </div>

                {/* COL 2: ACTIVE ENTRY (Center Focus) */}
                <div style={{
                    flex: 1,
                    background: '#1e293b', // Slightly lighter for focus
                    padding: '2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center', // Center vertically
                    maxWidth: '800px',
                    margin: '0 auto',
                    gap: '2rem'
                }}>

                    {/* A. SCAN INPUT */}
                    <div style={{ width: '100%', maxWidth: '500px' }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center' }}>1. SCAN BARCODE OR DATAMATRIX</label>
                        <input
                            ref={scanRef}
                            className="input-field"
                            style={{
                                width: '100%',
                                fontSize: '1.25rem',
                                textAlign: 'center',
                                padding: '1rem',
                                height: 'auto',
                                fontFamily: 'monospace',
                                border: '2px solid #3b82f6', // distinct border for focus
                                boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
                            }}
                            placeholder="Ready to Scan..."
                            value={formData.scanString}
                            onChange={e => setFormData({ ...formData, scanString: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleScanLookup()}
                            autoFocus
                        />
                    </div>

                    {/* B. DONOR RESULT CARD */}
                    <div style={{
                        width: '100%',
                        maxWidth: '500px',
                        background: '#0f172a',
                        borderRadius: '0.75rem',
                        padding: '1.5rem',
                        border: '1px solid #334155',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        opacity: donorInfo.firstName ? 1 : 0.5
                    }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>Donor Selected</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'white' }}>
                            {donorInfo.firstName || '---'} {donorInfo.lastName}
                        </div>
                        <div style={{ color: '#94a3b8' }}>
                            {donorInfo.address || 'Waiting for scan...'}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            {donorInfo.city ? `${donorInfo.city}, ${donorInfo.state} ${donorInfo.zip}` : ''}
                        </div>
                    </div>

                    {/* C. AMOUNT INPUT */}
                    <div style={{ width: '100%', maxWidth: '500px' }}>
                        <label style={{ display: 'block', color: '#4ade80', fontSize: '0.85rem', marginBottom: '0.5rem', textAlign: 'center', fontWeight: 600 }}>2. ENTER AMOUNT</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.5rem', color: '#4ade80' }}>$</span>
                            <input
                                ref={amountRef}
                                className="input-field"
                                type="number"
                                placeholder="0.00"
                                style={{
                                    width: '100%',
                                    fontSize: '2rem',
                                    textAlign: 'right',
                                    padding: '1rem 1rem 1rem 3rem',
                                    height: 'auto',
                                    fontWeight: 700,
                                    color: '#4ade80',
                                    border: '1px solid #334155'
                                }}
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>

                    {/* D. SAVE ACTION */}
                    <div style={{ width: '100%', maxWidth: '500px' }}>
                        <button
                            className="btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.1rem',
                                background: saving ? '#475569' : '#3b82f6'
                            }}
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving ? "Saving..." : "Save Record (Enter)"}
                        </button>
                    </div>

                </div>

                {/* COL 3: RECENT HISTORY (Right) */}
                <div style={{
                    width: '350px',
                    background: '#0f172a',
                    borderLeft: '1px solid #334155',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>RECENT SCANS</div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <tbody>
                                {records.map(r => (
                                    <tr key={r.DonationID} style={{
                                        borderBottom: '1px solid #1e293b',
                                        background: r.DonationID === lastSavedId ? 'rgba(74, 222, 128, 0.1)' : 'transparent'
                                    }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ color: 'white', fontWeight: 500 }}>${Number(r.GiftAmount).toFixed(2)}</div>
                                            <div style={{ color: '#64748b', fontSize: '0.7rem' }}>{r.SecondaryID || '#'} · {r.GiftMethod}</div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', color: '#64748b' }}>
                                            {new Date(r.CreatedAt).toLocaleTimeString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
// Helper styles
const labelStyle = { display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' };
const thStyle = { padding: '0.5rem', textAlign: 'left', color: '#64748b' };
const tdStyle = {};

