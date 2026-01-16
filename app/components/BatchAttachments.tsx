'use client';

import { useState, useEffect } from 'react';

interface Document {
    BatchDocumentID: number;
    DocumentType: 'ReplySlipsPDF' | 'ChecksPDF' | 'DepositSlip' | 'RelatedDocuments';
    FileName: string;
    UploadedAt: string;
}

export default function BatchAttachments({ batchId, paymentCategory, activeScan }: { batchId: string, paymentCategory: string, activeScan?: { documentId: number | null, pageNumber: number | null } }) {
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
        } else if (paymentCategory === 'Credit Card') {
            reqs.push({ label: 'Reply Slips', type: 'ReplySlipsPDF', required: true });
        } else if (paymentCategory === 'Cash') {
            reqs.push({ label: 'Reply Slips', type: 'ReplySlipsPDF', required: true });
            reqs.push({ label: 'Deposit Slip', type: 'DepositSlip', required: true });
        }

        reqs.push({ label: 'Related Documents', type: 'RelatedDocuments', required: false });

        return reqs;
    };

    const requirements = getRequirements();

    const handleAnalyzeAll = async () => {
        if (documents.length === 0) return alert("No documents to analyze.");
        if (!confirm(`Run AI Analysis on ALL ${documents.length} attached documents?`)) return;

        let totalProcessed = 0;
        let totalMatched = 0;
        let totalCreated = 0;
        let errors = 0;
        let lastError = '';

        for (const doc of documents) {
            try {
                const res = await fetch('/api/batches/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ batchId, documentId: doc.BatchDocumentID })
                });

                let data;
                const contentType = res.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    data = await res.json();
                } else {
                    const text = await res.text();
                    throw new Error(`Server returned ${res.status} ${res.statusText}: ${text.substring(0, 100)}`);
                }

                if (res.ok) {
                    totalProcessed += data.processed || 0;
                    totalMatched += data.matched || 0;
                    totalCreated += data.created || 0;
                } else {
                    console.error(`Failed to analyze doc ${doc.BatchDocumentID}`, data.error);
                    lastError = data.error || 'Unknown Error';
                    errors++;
                }
            } catch (e: any) {
                console.error(e);
                lastError = e.message;
                errors++;
            }
        }

        let msg = `Analysis Complete!\nProcessed Docs: ${documents.length}\nMatched (Linked): ${totalMatched}\nCreated (New): ${totalCreated}`;
        if (errors > 0) msg += `\nErrors: ${errors}\nLast Error: ${lastError}`;

        alert(msg);
        window.location.reload();
    };

    if (loading) return <div>Loading attachments...</div>;

    return (
        <div className="glass-panel" style={{ padding: '1rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>ATTACHMENTS</h3>
                {documents.length > 0 && (
                    <button
                        onClick={handleAnalyzeAll}
                        style={{
                            fontSize: '0.75rem',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white',
                            border: 'none',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 600
                        }}
                    >
                        ✨ Analyze All
                    </button>
                )}
            </div>

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
                                {uploaded && activeScan && activeScan.documentId === uploaded.BatchDocumentID && (
                                    <span style={{
                                        marginLeft: '0.5rem',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#065f46',
                                        background: '#d1fae5',
                                        padding: '0.1rem 0.4rem',
                                        borderRadius: '4px',
                                        border: '1px solid #10b981'
                                    }}>
                                        ⬅️ Found on Page {activeScan.pageNumber}
                                    </span>
                                )}
                            </div>

                            {uploaded ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <a href={`/api/documents/${uploaded.BatchDocumentID}`} target="_blank"
                                        style={{
                                            fontSize: '0.75rem', color: 'var(--color-primary)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px'
                                        }}>
                                        {uploaded.FileName}
                                    </a>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("Are you sure you want to remove this link?")) return;
                                            try {
                                                const res = await fetch(`/api/documents/${uploaded.BatchDocumentID}`, { method: 'DELETE' });
                                                if (res.ok) {
                                                    fetchDocuments();
                                                } else {
                                                    alert("Failed to delete");
                                                }
                                            } catch (e) { alert("Error deleting"); }
                                        }}
                                        style={{
                                            background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.6
                                        }}
                                        title="Remove Link"
                                    >
                                        🗑️
                                    </button>
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
                                        style={{
                                            fontSize: '0.75rem',
                                            padding: '0.25rem 0.75rem',
                                            background: '#3b82f6', // Hardcoded Blue for visibility
                                            color: 'white',
                                            borderRadius: '4px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
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
