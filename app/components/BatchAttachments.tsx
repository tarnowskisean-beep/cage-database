'use client';

import { useState, useEffect } from 'react';

interface Document {
    BatchDocumentID: number;
    DocumentType: 'ReplySlipsPDF' | 'ChecksPDF' | 'DepositSlip';
    FileName: string;
    UploadedAt: string;
}

export default function BatchAttachments({ batchId, paymentCategory }: { batchId: string, paymentCategory: string }) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const fetchDocuments = async () => {
        try {
            const res = await fetch(`/api/batches/${batchId}/documents`);
            if (res.ok) setDocuments(await res.json());
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchDocuments();
    }, [batchId]);

    const handleLinkSubmit = async (type: string, url: string) => {
        if (!url) return;
        setUploading(true);

        try {
            const res = await fetch(`/api/batches/${batchId}/documents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, url })
            });

            if (res.ok) {
                fetchDocuments();
            } else {
                const data = await res.json();
                alert('Error: ' + (data.error || 'Failed to save link'));
            }
        } catch (e) {
            console.error(e);
            alert('Save error');
        } finally {
            setUploading(false);
        }
    };

    const getRequirements = () => {
        // Validation Logic Display
        const reqs = [];
        if (paymentCategory === 'Checks' || paymentCategory === 'Mixed') {
            reqs.push({ label: 'Reply Slips', type: 'ReplySlipsPDF', required: true });
            reqs.push({ label: 'Check Images', type: 'ChecksPDF', required: true });
        } else if (paymentCategory === 'CC') {
            reqs.push({ label: 'Reply Slips', type: 'ReplySlipsPDF', required: true });
        } else if (paymentCategory === 'Cash') {
            reqs.push({ label: 'Reply Slips', type: 'ReplySlipsPDF', required: true });
            reqs.push({ label: 'Deposit Slip', type: 'DepositSlip', required: true });
        }
        return reqs;
    };

    const requirements = getRequirements();

    if (loading) return <div>Loading attachments...</div>;

    return (
        <div className="glass-panel" style={{ padding: '1rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>ATTACHMENTS</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {requirements.map(req => {
                    const uploaded = documents.find(d => d.DocumentType === req.type);
                    return (
                        <div key={req.type} style={{
                            display: 'flex', flexDirection: 'column', gap: '0.5rem',
                            padding: '0.75rem', background: 'var(--color-bg-base)', borderRadius: '4px',
                            border: uploaded ? '1px solid var(--color-active)' : '1px dashed var(--color-border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{req.label}</span>
                                {uploaded && <span style={{ color: 'var(--color-active)', fontSize: '0.8rem' }}>✓ Linked</span>}
                            </div>

                            {uploaded ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <a href={`/api/documents/${uploaded.BatchDocumentID}`} target="_blank"
                                        style={{
                                            fontSize: '0.75rem', color: 'var(--color-primary)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px'
                                        }}>
                                        {uploaded.FileName}
                                    </a>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Paste Google Drive Link..."
                                        style={{ flex: 1, fontSize: '0.75rem', padding: '0.25rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleLinkSubmit(req.type, e.currentTarget.value);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                    />
                                    <button
                                        disabled={uploading}
                                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--color-primary)', color: 'white', borderRadius: '4px' }}
                                        onClick={(e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            handleLinkSubmit(req.type, input.value);
                                            input.value = '';
                                        }}
                                    >
                                        {uploading ? '...' : 'Save'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
