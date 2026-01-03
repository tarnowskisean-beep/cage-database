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

    const handleUpload = async (type: string, file: File) => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        try {
            const res = await fetch(`/api/batches/${batchId}/documents`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                fetchDocuments();
            } else {
                alert('Upload failed');
            }
        } catch (e) {
            console.error(e);
            alert('Upload error');
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
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '0.5rem', background: 'var(--color-bg-base)', borderRadius: '4px',
                            border: uploaded ? '1px solid var(--color-active)' : '1px dashed var(--color-border)'
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{req.label}</span>
                                {uploaded ? (
                                    <a href={`/api/documents/${uploaded.BatchDocumentID}`} target="_blank" style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                                        {uploaded.FileName}
                                    </a>
                                ) : (
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-error)' }}>Required</span>
                                )}
                            </div>

                            {uploaded ? (
                                <span style={{ color: 'var(--color-active)' }}>✓</span>
                            ) : (
                                <label style={{
                                    cursor: uploading ? 'wait' : 'pointer',
                                    fontSize: '0.75rem', padding: '0.2rem 0.5rem',
                                    background: 'var(--color-primary)', color: 'white', borderRadius: '4px'
                                }}>
                                    {uploading ? '...' : 'Upload'}
                                    <input
                                        type="file"
                                        hidden
                                        accept="application/pdf,image/*"
                                        onChange={(e) => e.target.files && handleUpload(req.type, e.target.files[0])}
                                        disabled={uploading}
                                    />
                                </label>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
