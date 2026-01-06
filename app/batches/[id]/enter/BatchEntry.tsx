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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg-main)' }}>

            {/* 1. HEADER */}
            <div style={{ height: '50px', background: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', padding: '0 1rem', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <Link href="/batches" style={{ textDecoration: 'none', color: 'var(--color-text-muted)' }}>&larr; Back</Link>
                    <span style={{ color: 'var(--color-border)' }}>|</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-main)' }}>{batch?.BatchCode}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{batch?.ClientCode}</span>
                    <span style={{
                        padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: batch?.Status === 'Open' ? 'var(--color-success)' :
                            batch?.Status === 'Closed' ? 'var(--color-warning)' :
                                batch?.Status === 'Reconciled' ? '#c084fc' : 'var(--color-bg-surface)',
                        color: batch?.Status === 'Open' ? '#000' : 'white',
                        opacity: batch?.Status === 'Open' ? 0.8 : 1,
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
                            className="btn-secondary"
                            style={{ marginRight: '1rem', fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}
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
                            border: `1px solid ${batch?.Status === 'Reconciled' ? 'var(--color-text-muted)' : 'var(--color-success)'}`,
                            color: batch?.Status === 'Reconciled' ? 'var(--color-text-muted)' : 'var(--color-success)',
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
                            (records.filter(r => r.ScanDocumentID).length === records.length) ? 'var(--color-success)' : // 100% Green
                                (records.filter(r => r.ScanDocumentID).length > 0) ? 'var(--color-warning)' : // Partial Orange
                                    'var(--color-text-muted)' // Zero Grey
                        ) : 'var(--color-text-muted)'
                    }}>
                        Linked: {records.length > 0 ? Math.round((records.filter(r => r.ScanDocumentID).length / records.length) * 100) : 0}%
                    </span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-success)' }}>${records.reduce((sum, r) => sum + Number(r.GiftAmount), 0).toFixed(2)}</span>
                </div>
            </div>

            {/* 2. BODY CONTENT (ROW) */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', flexDirection: 'row' }}>

                {/* MAIN CONTENT AREA */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* DATA ENTRY FORM */}
                    <div style={{ flex: 1, minWidth: '800px', padding: '1.5rem', overflowY: 'auto', background: 'var(--color-bg-base)', borderRight: '1px solid var(--color-border)' }}>

                        {/* FORM CONTAINER */}
                        <div style={{
                            maxWidth: '1400px',
                            margin: '0 auto',
                            background: 'var(--color-bg-elevated)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden' // For border radius
                        }}>
                            {/* FORM HEADER */}
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderBottom: '1px solid var(--color-border)',
                                background: 'var(--color-bg-surface)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-main)' }}>record_details</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    {batch?.EntryMode === 'Manual' ? 'Manual Entry Mode' : 'Scan Mode'}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>

                                {/* LEFT COLUMN: DONOR INFORMATION */}
                                <div style={{ padding: '1.5rem', borderRight: '1px solid var(--color-border)' }}>
                                    <div style={{
                                        fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                        color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <span>👤</span> Donor Information
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {/* Row 1: ID & Classification */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>ClientID</Label>
                                                <Input disabled value={batch?.ClientCode || ''} style={{ background: 'var(--color-bg-base)', opacity: 0.7 }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Control ID / Scan</Label>
                                                {batch?.EntryMode === 'Manual' ? (
                                                    <div style={{
                                                        padding: '0.5rem', fontSize: '0.85rem', background: 'var(--color-bg-base)',
                                                        borderRadius: '4px', border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', textAlign: 'center'
                                                    }}>
                                                        Auto-Generated
                                                    </div>
                                                ) : (
                                                    <Input
                                                        ref={scanRef}
                                                        placeholder="Scan Barcode..."
                                                        style={{ borderColor: 'var(--color-brand)', boxShadow: '0 0 0 1px var(--color-brand-transparent)' }}
                                                        value={formData.scanString}
                                                        onChange={handleChange('scanString')}
                                                        onKeyDown={e => e.key === 'Enter' && handleScanLookup()}
                                                        autoFocus
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* Row 2: Mail Code & Entity */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Mail Code</Label>
                                                <Input
                                                    ref={manualEntryRef}
                                                    value={formData.mailCode}
                                                    onChange={handleChange('mailCode')}
                                                    autoFocus={batch?.EntryMode === 'Manual'}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Entity Type</Label>
                                                <Select value={formData.giftType} onChange={handleChange('giftType')}>
                                                    {GIFT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </Select>
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }}></div>

                                        {/* Row 3: Name Fields */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 1.5fr 0.5fr 1.5fr 0.5fr', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.7rem' }}>Pfx</Label>
                                                <Input value={formData.donorPrefix} onChange={handleChange('donorPrefix')} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.7rem' }}>First Name</Label>
                                                <Input value={formData.donorFirstName} onChange={handleChange('donorFirstName')} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.7rem' }}>Mid</Label>
                                                <Input value={formData.donorMiddleName} onChange={handleChange('donorMiddleName')} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.7rem' }}>Last Name</Label>
                                                <Input value={formData.donorLastName} onChange={handleChange('donorLastName')} style={{ fontWeight: 600 }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.7rem' }}>Sfx</Label>
                                                <Input value={formData.donorSuffix} onChange={handleChange('donorSuffix')} />
                                            </div>
                                        </div>

                                        {/* Row 4: Professional */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Employer</Label>
                                                <Input value={formData.donorEmployer} onChange={handleChange('donorEmployer')} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Occupation</Label>
                                                <Input value={formData.donorOccupation} onChange={handleChange('donorOccupation')} />
                                            </div>
                                        </div>

                                        {/* Row 5: Address */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <Label style={{ fontSize: '0.75rem' }}>Street Address</Label>
                                            <Input value={formData.donorAddress} onChange={handleChange('donorAddress')} />
                                        </div>

                                        {/* Row 6: City/State/Zip */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1.2fr', gap: '0.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>City</Label>
                                                <Input value={formData.donorCity} onChange={handleChange('donorCity')} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>State</Label>
                                                <Input value={formData.donorState} onChange={handleChange('donorState')} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Zip Code</Label>
                                                <Input value={formData.donorZip} onChange={handleChange('donorZip')} />
                                            </div>
                                        </div>

                                        {/* Row 7: Contact */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Phone</Label>
                                                <Input value={formData.donorPhone} onChange={handleChange('donorPhone')} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Email</Label>
                                                <Input value={formData.donorEmail} onChange={handleChange('donorEmail')} />
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {/* RIGHT COLUMN: TRANSACTION DETAILS */}
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{
                                        fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                                        color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <span>💳</span> Transaction Details
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                                        {/* Highlights Row */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--color-bg-base)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>Amount</Label>
                                                <div style={{ position: 'relative' }}>
                                                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-success)', fontWeight: 700 }}>$</span>
                                                    <Input
                                                        ref={amountRef}
                                                        type="number"
                                                        style={{ paddingLeft: '25px', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                                                        value={formData.amount}
                                                        onChange={handleChange('amount')}
                                                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                                                    />
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Transaction Date</Label>
                                                <div style={{ padding: '0.6rem', fontSize: '0.9rem', color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border)' }}>
                                                    {new Date().toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Method & Platform */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Method</Label>
                                                <Select
                                                    value={formData.method}
                                                    onChange={handleChange('method')}
                                                    disabled={!!batch && !['Mixed', 'Zeros'].includes(batch.PaymentCategory)}
                                                    style={{ opacity: (batch && !['Mixed', 'Zeros'].includes(batch.PaymentCategory)) ? 0.7 : 1 }}
                                                >
                                                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                                </Select>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Platform</Label>
                                                <Select value={formData.platform} onChange={handleChange('platform')}>
                                                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Row 3: Type & Subtype */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Transaction Type</Label>
                                                <Select value={formData.transactionType} onChange={handleChange('transactionType')}>
                                                    {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </Select>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Inactive?</Label>
                                                <Select value={formData.isInactive} onChange={handleChange('isInactive')}>
                                                    {YES_NO_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                                </Select>
                                            </div>
                                        </div>

                                        <div style={{ borderTop: '1px solid var(--color-border)', margin: '0.5rem 0' }}></div>

                                        {/* Row 4: Attribution */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Fund / Org</Label>
                                                <Input value={formData.organizationName} onChange={handleChange('organizationName')} placeholder="e.g. Annual Fund" />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>Conduit / Soft Credit</Label>
                                                <Input value={formData.giftConduit} onChange={handleChange('giftConduit')} />
                                            </div>
                                        </div>

                                        {/* Row 5: Dates */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>PostMark Year</Label>
                                                <Select value={formData.postMarkYear} onChange={handleChange('postMarkYear')}>
                                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                                </Select>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.75rem' }}>PostMark Qtr</Label>
                                                <Select value={formData.postMarkQuarter} onChange={handleChange('postMarkQuarter')}>
                                                    {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <option key={q} value={q}>{q}</option>)}
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Extra Fields Collapsed/Visually De-emphasized */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Fee</Label>
                                                <Input type="number" value={formData.giftFee} onChange={handleChange('giftFee')} style={{ fontSize: '0.8rem', padding: '0.3rem' }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                                <Label style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Pledge</Label>
                                                <Input type="number" value={formData.pledgeAmount} onChange={handleChange('pledgeAmount')} style={{ fontSize: '0.8rem', padding: '0.3rem' }} />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                            <Label style={{ fontSize: '0.75rem' }}>Splits / Comments</Label>
                                            <textarea
                                                className="input-field"
                                                style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem', height: '60px', resize: 'vertical' }}
                                                value={formData.comment}
                                                onChange={handleChange('comment')}
                                                placeholder="Enter notes..."
                                            />
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* FOOTER ACTIONS */}
                            <div style={{
                                padding: '1rem 1.5rem',
                                borderTop: '1px solid var(--color-border)',
                                background: 'var(--color-bg-surface)',
                                display: 'flex',
                                gap: '1rem',
                                justifyContent: 'flex-end'
                            }}>
                                <button className="btn-secondary" onClick={resetForm} style={{ minWidth: '100px' }}>Reset</button>
                                {batch?.Status === 'Reconciled' ? (
                                    <button className="btn-primary" style={{ minWidth: '150px', background: 'var(--color-bg-base)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }} disabled>
                                        🔒 Locked
                                    </button>
                                ) : (
                                    <button
                                        className="btn-primary"
                                        style={{
                                            minWidth: '200px',
                                            background: editingId ? '#3b82f6' : 'var(--color-success)',
                                            color: 'white',
                                            fontWeight: 600
                                        }}
                                        onClick={handleSave}
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : (editingId ? 'Update Record' : 'Save Record')}
                                    </button>
                                )}
                            </div>

                        </div>

                    </div>
                </div>

                {/* RIGHT SIDEBAR (HISTORY & ATTACHMENTS) */}
                <div style={{ width: '300px', background: 'var(--color-bg-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>

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
                                    background: r.DonationID === editingId ? 'rgba(59, 130, 246, 0.15)' : (r.DonationID === lastSavedId ? 'rgba(16, 185, 129, 0.1)' : 'transparent'),
                                    cursor: 'pointer',
                                    borderLeft: r.ScanDocumentID ? '4px solid var(--color-success)' : (r.DonationID === editingId ? '4px solid #3b82f6' : '4px solid transparent')
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
                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                    color: 'var(--color-success)',
                                                    border: '1px solid var(--color-success)',
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
                                                    color: 'var(--color-error)'
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

        </div>
    );
}
