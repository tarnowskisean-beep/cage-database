"use client";

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DonationRecord {
    DonationID: number;
    GiftAmount: number;
    SecondaryID?: string; // Check Number
    ScanString?: string;
    CreatedAt: string;
}

export default function BatchEntry({ id }: { id: string }) {
    // Safety: Prevent Hydration Mismatch
    const [isMounted, setIsMounted] = useState(false);

    const [records, setRecords] = useState<DonationRecord[]>([]);
    const [amount, setAmount] = useState('');
    const [checkNum, setCheckNum] = useState('');
    const [scanInput, setScanInput] = useState('');
    const [lastSaved, setLastSaved] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const amountRef = useRef<HTMLInputElement>(null);
    const checkRef = useRef<HTMLInputElement>(null);
    const scanRef = useRef<HTMLInputElement>(null);

    // Fetch Records Function
    const fetchRecords = async () => {
        if (!id) return;
        try {
            const res = await fetch(`/api/batches/${id}/donations`);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setRecords(data);
                } else {
                    console.error('API returned non-array:', data);
                    setRecords([]);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Load Initial Data
    useEffect(() => {
        setIsMounted(true);
        fetchRecords();
        scanRef.current?.focus();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSave = async () => {
        if (!amount) return;
        setSaving(true);

        try {
            const res = await fetch(`/api/batches/${id}/donations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    checkNumber: checkNum,
                    scanString: scanInput
                })
            });

            if (res.ok) {
                const newRecord = await res.json();
                setLastSaved(newRecord.DonationID);
                await fetchRecords();

                // Reset
                setAmount('');
                setCheckNum('');
                setScanInput('');
                scanRef.current?.focus();

                setTimeout(() => setLastSaved(null), 2000);
            } else {
                alert('Save Failed');
            }
        } catch (e) {
            console.error(e);
            alert('Save Error');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (document.activeElement === amountRef.current) {
                handleSave();
            } else if (document.activeElement === scanRef.current) {
                if (scanInput) {
                    checkRef.current?.focus();
                }
            } else if (document.activeElement === checkRef.current) {
                amountRef.current?.focus();
            }
        }
    };

    if (!isMounted) return <div style={{ padding: '2rem', color: 'hsl(var(--color-text-muted))' }}>Loading Batch...</div>;

    return (
        <div className="app-shell" style={{ height: '100vh', overflow: 'hidden' }}>
            {/* Header / Meta */}
            <div style={{
                height: '60px', borderBottom: '1px solid hsla(var(--color-border), 0.5)',
                display: 'flex', alignItems: 'center', padding: '0 2rem', justifyContent: 'space-between',
                backgroundColor: 'hsla(var(--color-bg-base), 0.9)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/batches" style={{ color: 'hsl(var(--color-text-muted))', textDecoration: 'none' }}>&larr; Back</Link>
                    <h2 style={{ margin: 0 }}>Batch {id} <span style={{ fontSize: '0.8em', color: 'hsl(var(--color-primary))', background: 'hsla(var(--color-primary), 0.1)', padding: '2px 8px', borderRadius: '4px' }}>Open</span></h2>
                </div>
                <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem' }}>
                    <div>Count: <strong>{records.length}</strong></div>
                    <div>Total: <strong>${records.reduce((sum, r) => sum + (parseFloat(r.GiftAmount as any) || 0), 0).toFixed(2)}</strong></div>
                </div>
            </div>

            {/* Main Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', height: 'calc(100vh - 60px)' }}>

                {/* Left: Input Panel */}
                <div style={{
                    padding: '2rem', borderRight: '1px solid hsla(var(--color-border), 0.5)',
                    background: 'hsla(var(--color-bg-surface), 0.5)', display: 'flex', flexDirection: 'column'
                }}>
                    <h3 style={{ marginBottom: '1.5rem', color: 'hsl(var(--color-accent))' }}>New Entry</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'hsl(var(--color-text-muted))' }}>Scan / Lookup (F1)</label>
                            <input
                                ref={scanRef}
                                className="input-field"
                                value={scanInput}
                                onChange={e => setScanInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Scan barcode..."
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'hsl(var(--color-text-muted))' }}>Check Number</label>
                                <input
                                    ref={checkRef}
                                    className="input-field"
                                    value={checkNum}
                                    onChange={e => setCheckNum(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="1234"
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'hsl(var(--color-text-muted))' }}>Amount ($)</label>
                                <input
                                    ref={amountRef}
                                    className="input-field"
                                    style={{ fontSize: '1.5rem', fontWeight: 600, color: 'hsl(var(--color-primary))' }}
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="0.00"
                                    type="number"
                                />
                                <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'hsl(var(--color-text-muted))' }}>Press Enter to Save</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                        <button className="btn-primary" style={{ width: '100%', marginBottom: '1rem' }} onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Record (Enter)'}
                        </button>
                    </div>
                </div>

                {/* Right: Real-time List */}
                <div style={{ overflowY: 'auto', background: 'hsl(var(--color-bg-base))' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'hsl(var(--color-bg-elevated))', zIndex: 10 }}>
                            <tr style={{ color: 'hsl(var(--color-text-muted))', textAlign: 'left' }}>
                                <th style={{ padding: '1rem' }}>#</th>
                                <th style={{ padding: '1rem' }}>Time</th>
                                <th style={{ padding: '1rem' }}>Method</th>
                                <th style={{ padding: '1rem' }}>Check #</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '1rem' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r, i) => (
                                <tr key={r.DonationID} style={{
                                    borderBottom: '1px solid hsla(var(--color-border), 0.3)',
                                    backgroundColor: r.DonationID === lastSaved ? 'hsla(140, 60%, 40%, 0.1)' : 'transparent',
                                    transition: 'background-color 0.5s'
                                }}>
                                    <td style={{ padding: '1rem', color: 'hsl(var(--color-text-muted))' }}>{records.length - i}</td>
                                    <td style={{ padding: '1rem' }}>{new Date(r.CreatedAt).toLocaleTimeString()}</td>
                                    <td style={{ padding: '1rem' }}>Check</td>
                                    <td style={{ padding: '1rem' }}>{r.SecondaryID || '-'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>${r.GiftAmount.toFixed(2)}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{ color: '#4ade80', fontSize: '0.8em' }}>✔ Saved</span>
                                    </td>
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '4rem', textAlign: 'center', color: 'hsl(var(--color-text-muted))' }}>
                                        <div>No records in this batch yet.</div>
                                        <div style={{ fontSize: '0.8em', marginTop: '0.5rem' }}>Scan a barcode or enter amount to begin.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
}
