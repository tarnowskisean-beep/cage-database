"use client";

import Link from 'next/link';
import { METHODS, PLATFORMS, GIFT_TYPES, YES_NO_OPTIONS } from '@/lib/constants';
import { Label } from '@/app/components/ui/Label';
import { Input } from '@/app/components/ui/Input';
import { Select } from '@/app/components/ui/Select';
import { useBatchEntry } from '@/app/hooks/useBatchEntry';
import { faker } from '@faker-js/faker';
import BatchAttachments from '@/app/components/BatchAttachments';

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
        resetForm,
        editingId,
        loadRecord,
        setFormData
    } = useBatchEntry({ id });

    const handleFillFakeData = () => {
        const fake = {
            donorFirstName: faker.person.firstName(),
            donorLastName: faker.person.lastName(),
            donorAddress: faker.location.streetAddress(),
            donorCity: faker.location.city(),
            donorState: faker.location.state({ abbreviated: true }),
            donorZip: faker.location.zipCode().substring(0, 5),
            donorEmail: faker.internet.email(),
            donorPhone: faker.phone.number(),
            donorEmployer: faker.company.name(),
            donorOccupation: faker.person.jobTitle(),
            organizationName: faker.company.name(),
            amount: faker.finance.amount({ min: 10, max: 1000, dec: 2 }),
            checkNumber: faker.finance.accountNumber(),
            mailCode: faker.string.alphanumeric(6).toUpperCase(),
        };
        setFormData(prev => ({
            ...prev,
            ...fake,
            donorMiddleName: '',
            donorSuffix: '',
            donorPrefix: '',
        }));
    };

    const handleBulkAdd = async () => {
        if (!confirm("Generate 25 fake records?")) return;

        try {
            const promises = [];
            for (let i = 0; i < 25; i++) {
                const method = faker.helpers.arrayElement(METHODS);
                const platform = faker.helpers.arrayElement(PLATFORMS);

                const fakePayload = {
                    scanString: '',
                    mailCode: faker.string.alphanumeric(6).toUpperCase(), // KEY for report
                    donorPrefix: faker.person.prefix(),
                    donorFirstName: faker.person.firstName(),
                    donorMiddleName: '',
                    donorLastName: faker.person.lastName(),
                    donorSuffix: '',
                    donorEmployer: faker.company.name(),
                    donorOccupation: faker.person.jobTitle(),
                    donorAddress: faker.location.streetAddress(),
                    donorCity: faker.location.city(),
                    donorState: faker.location.state({ abbreviated: true }),
                    donorZip: faker.location.zipCode().substring(0, 5),
                    giftFee: 0,

                    platform,
                    giftType: faker.helpers.arrayElement(GIFT_TYPES),
                    method,
                    isInactive: faker.datatype.boolean() ? 'True' : 'False',
                    postMarkYear: new Date().getFullYear().toString(),
                    postMarkQuarter: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
                    organizationName: faker.company.name(),
                    giftCustodian: '',
                    giftConduit: '',
                    amount: parseFloat(faker.finance.amount({ min: 10, max: 500, dec: 2 })),
                    pledgeAmount: 0,
                    donorPhone: faker.phone.number(),
                    donorEmail: faker.internet.email(),
                    comment: 'Bulk Generated',
                    checkNumber: faker.finance.accountNumber(),
                    giftYear: new Date().getFullYear().toString(),
                    giftQuarter: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
                };

                promises.push(
                    fetch(`/api/save-donation`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...fakePayload,
                            batchId: id // Critical for bypass route
                        })
                    })
                );
            }

            await Promise.all(promises);
            window.location.reload();
        } catch (e: any) {
            console.error(e);
            alert(`Bulk add failed: ${e.message}`);
        }
    };

    const toggleBatchStatus = async () => {
        if (!batch) return;
        const newStatus = batch.Status === 'Open' ? 'Closed' : 'Open';
        if (batch.Status === 'Reconciled') return alert("Reconciled batches cannot be reopened.");

        if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

        try {
            const res = await fetch(`/api/batches/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                window.location.reload();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to update batch status');
            }
        } catch (e) { console.error(e); }
    };

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
                    <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: batch?.Status === 'Open' ? '#4ade80' :
                            batch?.Status === 'Closed' ? '#fb923c' :
                                batch?.Status === 'Reconciled' ? '#c084fc' : '#334155',
                        color: batch?.Status === 'Open' ? '#022c22' : 'white',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                        {batch?.Status === 'Open' ? '🟢 OPEN' :
                            batch?.Status === 'Closed' ? '🟠 CLOSED' :
                                batch?.Status === 'Reconciled' ? '🔒 RECONCILED' :
                                    batch?.Status}
                    </span>
                    {editingId && <span style={{ background: '#3b82f6', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>EDITING MODE</span>}
                </div>
                <div>
                    {batch?.Status !== 'Reconciled' && (
                        <button
                            onClick={toggleBatchStatus}
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                marginRight: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            {batch?.Status === 'Open' ? '🔒 Close Batch' : '🔓 Reopen Batch'}
                        </button>
                    )}
                    <button
                        onClick={handleBulkAdd}
                        disabled={batch?.Status === 'Reconciled'}
                        style={{
                            background: 'transparent',
                            border: `1px solid ${batch?.Status === 'Reconciled' ? 'var(--color-text-muted)' : '#8b5cf6'}`,
                            color: batch?.Status === 'Reconciled' ? 'var(--color-text-muted)' : '#8b5cf6',
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', marginRight: '1rem',
                            cursor: batch?.Status === 'Reconciled' ? 'not-allowed' : 'pointer',
                        }}
                    >
                        ⚡ Bulk Add 25
                    </button>
                    <button
                        onClick={handleFillFakeData}
                        disabled={batch?.Status === 'Reconciled'}
                        style={{
                            background: 'transparent',
                            border: `1px solid ${batch?.Status === 'Reconciled' ? 'var(--color-text-muted)' : 'var(--color-primary)'}`,
                            color: batch?.Status === 'Reconciled' ? 'var(--color-text-muted)' : 'var(--color-primary)',
                            padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', marginRight: '1rem',
                            cursor: batch?.Status === 'Reconciled' ? 'not-allowed' : 'pointer',
                            opacity: batch?.Status === 'Reconciled' ? 0.5 : 1
                        }}
                        title="Auto-fill with Fake Data"
                    >
                        ⚡ Fill Fake Form
                    </button>
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
                                <Select
                                    value={formData.method}
                                    onChange={handleChange('method')}
                                    disabled={!!batch && !['Mixed', 'Zeros'].includes(batch.PaymentCategory)}
                                    style={{
                                        background: (batch && !['Mixed', 'Zeros'].includes(batch.PaymentCategory)) ? 'var(--color-bg-base)' : undefined,
                                        opacity: (batch && !['Mixed', 'Zeros'].includes(batch.PaymentCategory)) ? 0.7 : 1
                                    }}
                                >
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
                                <Label>Fee</Label>
                                <Input type="number" value={formData.giftFee} onChange={handleChange('giftFee')} />
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
                                {batch?.Status === 'Reconciled' ? (
                                    <button className="btn-primary" style={{ flex: 2, background: 'var(--color-text-muted)', cursor: 'not-allowed' }} disabled>
                                        🔒 Batch Locked (Reconciled)
                                    </button>
                                ) : (
                                    <button className="btn-primary" style={{ flex: 2, background: editingId ? 'var(--color-active)' : undefined }} onClick={handleSave} disabled={saving}>
                                        {saving ? 'Saving...' : (editingId ? 'Update Record' : 'Save')}
                                    </button>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* RIGHT SIDEBAR (HISTORY & ATTACHMENTS) */}
                <div style={{ width: '300px', background: 'var(--color-bg-sidebar)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>

                    {/* ATTACHMENTS */}
                    {batch && <BatchAttachments batchId={id} paymentCategory={batch.PaymentCategory} />}

                    <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 600, marginTop: '1rem' }}>RECENT SCANS</div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {records.map(r => (
                            <div
                                key={r.DonationID}
                                onClick={() => loadRecord(r)}
                                style={{
                                    padding: '0.75rem',
                                    borderBottom: '1px solid var(--color-border)',
                                    background: r.DonationID === editingId ? 'rgba(59, 130, 246, 0.15)' : (r.DonationID === lastSavedId ? 'rgba(51, 204, 102, 0.1)' : 'transparent'),
                                    cursor: 'pointer',
                                    borderLeft: r.DonationID === editingId ? '4px solid var(--color-primary)' : '4px solid transparent'
                                }}
                            >
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
