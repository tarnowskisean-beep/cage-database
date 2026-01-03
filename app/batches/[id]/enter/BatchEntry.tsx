"use client";

import Link from 'next/link';
import { METHODS, PLATFORMS, GIFT_TYPES, YES_NO_OPTIONS } from '@/lib/constants';
import { Label } from '@/app/components/ui/Label';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useBatchEntry } from '@/app/hooks/useBatchEntry';

export default function BatchEntry({ id }: { id: string }) {
    const {
        isMounted,
        batch,
        records,
        loading,
        saving,
        lastSavedId,
        formData,
        handleChange,
        scanRef,
        amountRef,
        manualEntryRef,
        handleScanLookup,
        handleSave,
        resetForm
    } = useBatchEntry({ id });

    if (!isMounted || loading) return <div className="p-8" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', margin: '-2rem', width: 'calc(100% + 4rem)', background: 'var(--color-bg-base)' }}>

            {/* 1. HEADER */}
            <div style={{ height: '50px', background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', padding: '0 1rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <Link href="/batches" style={{ textDecoration: 'none', color: 'var(--color-text-muted)' }}>&larr; Back</Link>
                    <span style={{ color: 'var(--color-border)' }}>|</span>
                    <span style={{ fontWeight: 600 }}>{batch?.BatchCode}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{batch?.ClientCode}</span>
                </div>
                <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginRight: '1rem' }}>Total: {records.length}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-active)' }}>${records.reduce((sum, r) => sum + Number(r.GiftAmount), 0).toFixed(2)}</span>
                </div>
            </div>

            {/* 2. MAIN SPLIT VIEW */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* LEFT: DONOR DATA & RECORD LIST (Simulating the screen layout where left is donor) */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', gap: '2rem' }}>

                    {/* FORM CONTAINER */}
                    <div style={{
                        flex: 1,
                        maxWidth: '900px',
                        margin: '0 auto',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '2rem',
                        alignItems: 'start'
                    }}>

                        {/* LEFT COLUMN: DONOR */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>ClientID</Label>
                                <Input disabled value={batch?.ClientCode || ''} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>CagingID / Scan</Label>
                                {batch?.EntryMode === 'Manual' ? (
                                    <div style={{
                                        padding: '0.4rem',
                                        fontSize: '0.9rem',
                                        marginBottom: '0.5rem',
                                        background: 'var(--color-bg-elevated)',
                                        color: 'var(--color-text-muted)',
                                        borderRadius: '4px',
                                        border: '1px dashed var(--color-border)',
                                        textAlign: 'center'
                                    }}>
                                        Manual Entry Mode (No Scan)
                                    </div>
                                ) : (
                                    <Input
                                        ref={scanRef}
                                        placeholder="Scan here..."
                                        style={{ border: '1px solid var(--color-primary)' }}
                                        value={formData.scanString}
                                        onChange={handleChange('scanString')}
                                        onKeyDown={e => e.key === 'Enter' && handleScanLookup()}
                                        autoFocus
                                    />
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Mail Code</Label>
                                <Input
                                    ref={manualEntryRef}
                                    value={formData.mailCode}
                                    onChange={handleChange('mailCode')}
                                    autoFocus={batch?.EntryMode === 'Manual'}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Prefix</Label>
                                <Input value={formData.donorPrefix} onChange={handleChange('donorPrefix')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>First Name</Label>
                                <Input value={formData.donorFirstName} onChange={handleChange('donorFirstName')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Middle Name</Label>
                                <Input value={formData.donorMiddleName} onChange={handleChange('donorMiddleName')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Last Name</Label>
                                <Input value={formData.donorLastName} onChange={handleChange('donorLastName')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Suffix</Label>
                                <Input value={formData.donorSuffix} onChange={handleChange('donorSuffix')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Employer</Label>
                                <Input value={formData.donorEmployer} onChange={handleChange('donorEmployer')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Occupation</Label>
                                <Input value={formData.donorOccupation} onChange={handleChange('donorOccupation')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Address</Label>
                                <Input value={formData.donorAddress} onChange={handleChange('donorAddress')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>City</Label>
                                <Input value={formData.donorCity} onChange={handleChange('donorCity')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>State</Label>
                                <Input value={formData.donorState} onChange={handleChange('donorState')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Zip</Label>
                                <Input value={formData.donorZip} onChange={handleChange('donorZip')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Fee</Label>
                                <Input type="number" value={formData.giftFee} onChange={handleChange('giftFee')} />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: TRANSACTION */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Platform</Label>
                                <Select value={formData.platform} onChange={handleChange('platform')}>
                                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Type</Label>
                                <Select value={formData.giftType} onChange={handleChange('giftType')}>
                                    {GIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Method</Label>
                                <Select value={formData.method} onChange={handleChange('method')}>
                                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Yes Inactive</Label>
                                <Select value={formData.isInactive} onChange={handleChange('isInactive')}>
                                    {YES_NO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Batch</Label>
                                <Input disabled value={batch?.BatchCode || ''} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Date</Label>
                                <Input disabled value={new Date().toLocaleString()} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>PostMark Year</Label>
                                <Select value={formData.postMarkYear} onChange={handleChange('postMarkYear')}>
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>PostMark Qtr</Label>
                                <Select value={formData.postMarkQuarter} onChange={handleChange('postMarkQuarter')}>
                                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Gift Organization</Label>
                                <Input value={formData.organizationName} onChange={handleChange('organizationName')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Gift Custodian</Label>
                                <Input value={formData.giftCustodian} onChange={handleChange('giftCustodian')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Conduit</Label>
                                <Input value={formData.giftConduit} onChange={handleChange('giftConduit')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ fontWeight: 700, color: 'var(--color-active)' }}>Gift Amount</Label>
                                <Input
                                    ref={amountRef}
                                    type="number"
                                    style={{ fontWeight: 700, borderColor: 'var(--color-active)', color: 'var(--color-active)' }}
                                    value={formData.amount}
                                    onChange={handleChange('amount')}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Pledge Amount</Label>
                                <Input type="number" value={formData.pledgeAmount} onChange={handleChange('pledgeAmount')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Phone</Label>
                                <Input value={formData.donorPhone} onChange={handleChange('donorPhone')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Email</Label>
                                <Input value={formData.donorEmail} onChange={handleChange('donorEmail')} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label>Comment</Label>
                                <textarea
                                    className="input-field"
                                    style={{ width: '100%', padding: '0.4rem', fontSize: '0.9rem', marginBottom: '0.5rem', height: '60px' }}
                                    value={formData.comment}
                                    onChange={handleChange('comment')}
                                />
                            </div>

                            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                                <button className="btn-primary" style={{ flex: 1, background: 'var(--color-border)' }} onClick={resetForm}>Reset</button>
                                <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </div>

                    </div>
                </div>

                {/* RIGHT SIDEBAR (HISTORY) */}
                <div style={{ width: '300px', background: 'var(--color-bg-sidebar)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>RECENT SCANS</div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {records.map(r => (
                            <div key={r.DonationID} style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', background: r.DonationID === lastSavedId ? 'rgba(51, 204, 102, 0.1)' : 'transparent' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>${Number(r.GiftAmount).toFixed(2)}</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(r.CreatedAt).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                    {r.DonorFirstName} {r.DonorLastName}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
