import { useState, useRef, useCallback, useEffect } from 'react';
import { Batch, DonationRecord } from '@/types';

interface UseBatchEntryProps {
    id: string;
}

export function useBatchEntry({ id }: UseBatchEntryProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [batch, setBatch] = useState<Batch | null>(null);
    const [records, setRecords] = useState<DonationRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSavedId, setLastSavedId] = useState<number | null>(null);

    // Refs
    const scanRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const manualEntryRef = useRef<HTMLInputElement>(null);

    // Form State
    const initialFormState = {
        // DONOR
        scanString: '',
        mailCode: '',
        donorPrefix: '',
        donorFirstName: '',
        donorMiddleName: '',
        donorLastName: '',
        donorSuffix: '',
        donorEmployer: '',
        donorOccupation: '',
        donorAddress: '',
        donorCity: '',
        donorState: '',
        donorZip: '',
        giftFee: '',

        // TRANSACTION
        platform: '',
        giftType: '',
        method: '',
        isInactive: 'False',
        postMarkYear: new Date().getFullYear().toString(),
        postMarkQuarter: 'Q1',
        organizationName: '',
        giftCustodian: '',
        giftConduit: '',
        amount: '',
        pledgeAmount: '',
        donorPhone: '',
        donorEmail: '',
        comment: '',

        // Hidden / System
        checkNumber: '',
        giftYear: '',
        giftQuarter: '',
    };

    const [formData, setFormData] = useState(initialFormState);

    // Helper for inputs
    const handleChange = (field: keyof typeof initialFormState) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

    // --- DATA FETCHING ---
    const fetchBatch = useCallback(async () => {
        try {
            const res = await fetch(`/api/batches/${id}`);
            if (res.ok) {
                const data = await res.json();
                setBatch(data);
                // Initialize defaults
                setFormData(prev => ({
                    ...prev,
                    platform: data.DefaultGiftPlatform || 'Cage',
                    giftType: data.DefaultGiftType || 'Individual/Trust/IRA',
                    method: data.DefaultGiftMethod || 'Check',
                    giftYear: data.DefaultGiftYear?.toString(),
                    giftQuarter: data.DefaultGiftQuarter,
                    postMarkYear: data.DefaultGiftYear?.toString() || new Date().getFullYear().toString(),
                    postMarkQuarter: data.DefaultGiftQuarter || 'Q1'
                }));
            }
        } catch (e) { console.error(e); }
    }, [id]);

    const fetchRecords = useCallback(async () => {
        try {
            const res = await fetch(`/api/batches/${id}/donations`);
            if (res.ok) {
                const data = await res.json();
                setRecords(Array.isArray(data) ? data : []);
            }
        } catch (e) { console.error(e); }
    }, [id]);

    useEffect(() => {
        setIsMounted(true);
        if (id) {
            Promise.all([fetchBatch(), fetchRecords()]).finally(() => setLoading(false));
        }
    }, [id, fetchBatch, fetchRecords]);

    // --- HANDLERS ---
    const handleScanLookup = () => {
        const raw = formData.scanString;
        if (!raw) return;

        // METHOD B: Datamatrix (Tab Separated)
        if (raw.includes('\t')) {
            console.log("Detected: Datamatrix");
            const parts = raw.split('\t');
            setFormData(prev => ({
                ...prev,
                mailCode: parts[0] || '',
                checkNumber: parts[1] || '',
                donorPrefix: parts[2] || '',
                donorFirstName: parts[3] || '',
                donorMiddleName: parts[4] || '',
                donorLastName: parts[5] || '',
                donorSuffix: parts[6] || '',
                donorAddress: (parts[7] || '') + (parts[8] ? ' ' + parts[8] : ''),
                donorCity: parts[9] || '',
                donorState: parts[10] || '',
                donorZip: parts[11] || ''
            }));
        } else {
            // METHOD A: Barcode Lookup
            console.log("Detected: Barcode");
            fetch(`/api/lookup/caging/${encodeURIComponent(raw)}`)
                .then(res => res.ok ? res.json() : { found: false })
                .then(data => {
                    if (data.found && data.record) {
                        setFormData(prev => ({
                            ...prev,
                            checkNumber: raw,
                            donorFirstName: data.record.FirstName || '',
                            donorLastName: data.record.LastName || '',
                            donorAddress: data.record.Address || '',
                            donorCity: data.record.City || '',
                            donorState: data.record.State || '',
                            donorZip: data.record.Zip || ''
                        }));
                    }
                })
                .catch(() => alert('Barcode not found'));
        }
        amountRef.current?.focus();
    };

    const handleSave = async () => {
        if (!formData.amount) return alert("Amount is required");

        setSaving(true);
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                giftPledgeAmount: parseFloat(formData.pledgeAmount) || 0,
                giftFee: parseFloat(formData.giftFee) || 0,
                isInactive: formData.isInactive === 'True',
                checkNumber: formData.checkNumber || formData.scanString
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

                // RESET FORM
                setFormData(prev => ({
                    ...initialFormState,
                    platform: prev.platform,
                    giftType: prev.giftType,
                    method: prev.method,
                    postMarkYear: prev.postMarkYear,
                    postMarkQuarter: prev.postMarkQuarter,
                    giftYear: prev.giftYear,
                    giftQuarter: prev.giftQuarter
                }));

                if (batch?.EntryMode === 'Manual') {
                    manualEntryRef.current?.focus();
                } else {
                    scanRef.current?.focus();
                }
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

    const resetForm = () => setFormData(initialFormState);

    return {
        isMounted,
        batch,
        records,
        loading,
        saving,
        lastSavedId,
        formData,
        setFormData,
        handleChange,
        scanRef,
        amountRef,
        manualEntryRef,
        handleScanLookup,
        handleSave,
        resetForm
    };
}
