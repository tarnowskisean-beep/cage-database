"use client";

import Link from 'next/link';
import { METHODS, PLATFORMS, GIFT_TYPES, TRANSACTION_TYPES, YES_NO_OPTIONS } from '@/lib/constants';
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg-base)' }}>

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
                    <span style={{
                        fontSize: '0.8rem', marginRight: '1rem', fontWeight: 600,
                        color: (records.length > 0) ? (
                            (records.filter(r => r.ScanDocumentID).length === records.length) ? '#10b981' : // 100% Green
                                (records.filter(r => r.ScanDocumentID).length > 0) ? '#f59e0b' : // Partial Orange
                                    'var(--color-text-muted)' // Zero Grey
                        ) : 'var(--color-text-muted)'
                    }}>
                        Linked: {records.length > 0 ? Math.round((records.filter(r => r.ScanDocumentID).length / records.length) * 100) : 0}%
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-active)' }}>${records.reduce((sum, r) => sum + Number(r.GiftAmount), 0).toFixed(2)}</span>
                </div>
            </div>

            {/* 2. MAIN SPLIT VIEW */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* LEFT: DONOR DATA & RECORD LIST (Simulating the screen layout where left is donor) */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>

                    {/* FORM CONTAINER */}
                    <div style={{
                        maxWidth: '900px',
                        margin: '0 auto',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '2rem',
                        alignItems: 'start',
                        // High Contrast Container
                        background: '#000000',
                        border: '1px solid #3f3f46',
                        padding: '2rem',
                        borderRadius: '8px'
                    }}>

                        {/* LEFT COLUMN: DONOR */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>ClientID</Label>
                                <Input disabled value={batch?.ClientCode || ''} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>CagingID / Scan</Label>
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
                                        style={{ border: '2px solid var(--color-primary)', background: '#1c1c1e', color: 'white' }}
                                        value={formData.scanString}
                                        onChange={handleChange('scanString')}
                                        onKeyDown={e => e.key === 'Enter' && handleScanLookup()}
                                        autoFocus
                                    />
                                )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Mail Code</Label>
                                <Input
                                    ref={manualEntryRef}
                                    value={formData.mailCode}
                                    onChange={handleChange('mailCode')}
                                    autoFocus={batch?.EntryMode === 'Manual'}
                                    style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Prefix</Label>
                                <Input value={formData.donorPrefix} onChange={handleChange('donorPrefix')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>First Name</Label>
                                <Input value={formData.donorFirstName} onChange={handleChange('donorFirstName')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Middle Name</Label>
                                <Input value={formData.donorMiddleName} onChange={handleChange('donorMiddleName')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Last Name</Label>
                                <Input value={formData.donorLastName} onChange={handleChange('donorLastName')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Suffix</Label>
                                <Input value={formData.donorSuffix} onChange={handleChange('donorSuffix')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Employer</Label>
                                <Input value={formData.donorEmployer} onChange={handleChange('donorEmployer')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Occupation</Label>
                                <Input value={formData.donorOccupation} onChange={handleChange('donorOccupation')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Address</Label>
                                <Input value={formData.donorAddress} onChange={handleChange('donorAddress')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>City</Label>
                                <Input value={formData.donorCity} onChange={handleChange('donorCity')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>State</Label>
                                <Input value={formData.donorState} onChange={handleChange('donorState')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Zip</Label>
                                <Input value={formData.donorZip} onChange={handleChange('donorZip')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>

                        </div>

                        {/* RIGHT COLUMN: TRANSACTION */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Platform</Label>
                                <Select value={formData.platform} onChange={handleChange('platform')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }}>
                                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Trans. Type</Label>
                                <Select value={formData.transactionType} onChange={handleChange('transactionType')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }}>
                                    {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Entity Type</Label>
                                <Select value={formData.giftType} onChange={handleChange('giftType')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }}>
                                    {GIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Method</Label>
                                <Select
                                    value={formData.method}
                                    onChange={handleChange('method')}
                                    disabled={!!batch && !['Mixed', 'Zeros'].includes(batch.PaymentCategory)}
                                    style={{
                                        background: (batch && !['Mixed', 'Zeros'].includes(batch.PaymentCategory)) ? '#0f0f10' : '#1c1c1e',
                                        opacity: (batch && !['Mixed', 'Zeros'].includes(batch.PaymentCategory)) ? 0.7 : 1,
                                        borderColor: '#52525b',
                                        color: 'white'
                                    }}
                                >
                                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Yes Inactive</Label>
                                <Select value={formData.isInactive} onChange={handleChange('isInactive')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }}>
                                    {YES_NO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Batch</Label>
                                <Input disabled value={batch?.BatchCode || ''} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Date</Label>
                                <Input disabled value={new Date().toLocaleString()} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>PostMark Year</Label>
                                <Select value={formData.postMarkYear} onChange={handleChange('postMarkYear')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }}>
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>PostMark Qtr</Label>
                                <Select value={formData.postMarkQuarter} onChange={handleChange('postMarkQuarter')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }}>
                                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                                </Select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Gift Organization</Label>
                                <Input value={formData.organizationName} onChange={handleChange('organizationName')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Gift Custodian</Label>
                                <Input value={formData.giftCustodian} onChange={handleChange('giftCustodian')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Conduit</Label>
                                <Input value={formData.giftConduit} onChange={handleChange('giftConduit')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ fontWeight: 700, color: 'var(--color-active)', fontSize: '0.85rem' }}>Gift Amount</Label>
                                <Input
                                    ref={amountRef}
                                    type="number"
                                    style={{ fontWeight: 700, borderColor: 'var(--color-active)', color: 'var(--color-active)', background: '#1c1c1e' }}
                                    value={formData.amount}
                                    onChange={handleChange('amount')}
                                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Fee</Label>
                                <Input type="number" value={formData.giftFee} onChange={handleChange('giftFee')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Pledge Amount</Label>
                                <Input type="number" value={formData.pledgeAmount} onChange={handleChange('pledgeAmount')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Phone</Label>
                                <Input value={formData.donorPhone} onChange={handleChange('donorPhone')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                                <Label style={{ color: 'white', fontSize: '0.85rem' }}>Email</Label>
                                <Input value={formData.donorEmail} onChange={handleChange('donorEmail')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                            <Label style={{ color: 'white', fontSize: '0.85rem' }}>Mail Code</Label>
                            <Input value={formData.mailCode} onChange={handleChange('mailCode')} style={{ background: '#1c1c1e', borderColor: '#52525b', color: 'white' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: '0.5rem' }}>
                            <Label style={{ color: 'white', fontSize: '0.85rem' }}>Comment</Label>
                            <textarea
                                className="input-field"
                                style={{ width: '100%', padding: '0.4rem', fontSize: '0.9rem', marginBottom: '0.5rem', height: '60px', background: '#1c1c1e', borderColor: '#52525b', color: 'white' }}
                                value={formData.comment}
                                onChange={handleChange('comment')}
                            />
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                            <button className="btn-primary" style={{ flex: 1, background: '#3f3f46', color: 'white', border: '1px solid #52525b' }} onClick={resetForm}>Reset</button>
                            {batch?.Status === 'Reconciled' ? (
                                <button className="btn-primary" style={{ flex: 2, background: '#27272a', color: '#71717a', cursor: 'not-allowed', border: '1px solid #3f3f46' }} disabled>
                                    🔒 Batch Locked (Reconciled)
                                </button>
                            ) : (
                                <button
                                    className="btn-primary"
                                    style={{
                                        flex: 2,
                                        background: editingId ? '#3b82f6' : '#10b981', // Blue for Update, Green for Save
                                        color: 'white',
                                        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
                                        border: 'none'
                                    }}
                                    onClick={handleSave}
                                    disabled={saving}
                                >
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
                {batch && (
                    <BatchAttachments
                        batchId={id}
                        paymentCategory={batch.PaymentCategory}
                        activeScan={
                            editingId ? (() => {
                                const r = records.find(rec => rec.DonationID === editingId);
                                return r ? { documentId: r.ScanDocumentID || null, pageNumber: r.ScanPageNumber || null } : undefined;
                            })() : undefined
                        }
                    />
                )}

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
                                borderLeft: r.ScanDocumentID ? '4px solid #10b981' : (r.DonationID === editingId ? '4px solid var(--color-primary)' : '4px solid transparent')
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>${Number(r.GiftAmount).toFixed(2)}</span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(r.CreatedAt).toLocaleTimeString()}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: '0.5rem' }}>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {r.OrganizationName || `${r.DonorFirstName || ''} ${r.DonorLastName || ''}`.trim() || <i style={{ opacity: 0.5 }}>No Name</i>}
                                    </span>
                                    {(r.DonorAddress || r.DonorCity) && (
                                        <span style={{ fontSize: '0.7rem', opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {[r.DonorAddress, r.DonorCity, r.DonorState, r.DonorZip].filter(Boolean).join(', ')}
                                        </span>
                                    )}
                                </div>
                                {r.ScanDocumentID && (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`/api/documents/${r.ScanDocumentID}#page=${r.ScanPageNumber}`, '_blank');
                                            }}
                                            title={`View Scan on Page ${r.ScanPageNumber}`}
                                            style={{
                                                background: '#d1fae5',
                                                color: '#065f46',
                                                border: '1px solid #10b981',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.75rem',
                                                padding: '0.1rem 0.4rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.2rem'
                                            }}
                                        >
                                            📎 {r.ScanPageNumber}
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const reason = prompt("Report AI Error:\nWhat is wrong with this link? (e.g. Wrong Page, Wrong Donor)");
                                                if (reason) {
                                                    alert("Feedback received. We will use this to train future models.");
                                                }
                                            }}
                                            title="Report Bad Link"
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                color: '#ef4444'
                                            }}
                                        >
                                            ⚠️
                                        </button>
                                    </div>
                                )}
                                {!r.ScanDocumentID && (
                                    <span
                                        title="No Scan Linked"
                                        style={{
                                            marginLeft: '0.5rem',
                                            fontSize: '0.9rem',
                                            opacity: 0.3,
                                            cursor: 'help'
                                        }}
                                    >
                                        ❌
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
        </div >
    );
}
