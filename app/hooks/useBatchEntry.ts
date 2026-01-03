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
    const [editingId, setEditingId] = useState<number | null>(null);

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
        postMarkQuarter: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
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
                    postMarkQuarter: data.DefaultGiftQuarter || `Q${Math.floor(new Date().getMonth() / 3) + 1}`
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
        // ... (existing scan logic)
        amountRef.current?.focus();
    };

    const loadRecord = (record: DonationRecord) => {
        setEditingId(record.DonationID);
        setFormData({
            ...initialFormState,
            // Core
            amount: record.GiftAmount?.toString() || '',
            pledgeAmount: record.GiftPledgeAmount?.toString() || '',
            giftFee: record.GiftFee?.toString() || '',

            // Transaction
            checkNumber: record.SecondaryID || '',
            scanString: record.ScanString || '',
            platform: record.GiftPlatform || batch?.DefaultGiftPlatform || '',
            giftType: record.GiftType || batch?.DefaultGiftType || '',
            method: record.GiftMethod || batch?.DefaultGiftMethod || '',
            postMarkYear: record.PostMarkYear?.toString() || new Date().getFullYear().toString(),
            postMarkQuarter: record.PostMarkQuarter || `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
            isInactive: record.IsInactive ? 'True' : 'False',
            comment: record.Comment || '',
            organizationName: record.OrganizationName || '',
            giftCustodian: record.GiftCustodian || '',
            giftConduit: record.GiftConduit || '',

            // Donor
            mailCode: '', // Assuming mailCode is transient or parsed from scan
            donorPrefix: record.DonorPrefix || '',
            donorFirstName: record.DonorFirstName || '',
            donorMiddleName: record.DonorMiddleName || '',
            donorLastName: record.DonorLastName || '',
            donorSuffix: record.DonorSuffix || '',
            donorEmployer: record.DonorEmployer || '',
            donorOccupation: record.DonorOccupation || '',
            donorAddress: record.DonorAddress || '',
            donorCity: record.DonorCity || '',
            donorState: record.DonorState || '',
            donorZip: record.DonorZip || '',
            donorPhone: record.DonorPhone || '',
            donorEmail: record.DonorEmail || '',

            // Hidden
            giftYear: record.GiftYear?.toString() || '',
            giftQuarter: record.GiftQuarter || ''
        });

        // Focus first field
        if (batch?.EntryMode === 'Manual') {
            manualEntryRef.current?.focus();
        } else {
            scanRef.current?.focus();
        }
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
                checkNumber: formData.checkNumber || formData.scanString,

                // Mapped for Backend API (snake_case vs PascalCase needs care, but our API handles logic)
                // Actually our POST/PUT expects specific keys. Let's map to what API expects.
                // For PUT: we use PascalCase keys in the API body destructuring in our new route
                // For POST: we used snakeish camelCase. 
                // Let's standarize on what the API reads.

                // Common
                GiftAmount: parseFloat(formData.amount),
                SecondaryID: formData.checkNumber || formData.scanString,
                CheckNumber: formData.checkNumber || formData.scanString,
                ScanString: formData.scanString,
                GiftMethod: formData.method,
                GiftPlatform: formData.platform,
                GiftType: formData.giftType,
                // ... map defaults if needed, but form has them
                GiftYear: formData.giftYear ? parseInt(formData.giftYear) : undefined,
                GiftQuarter: formData.giftQuarter,

                DonorPrefix: formData.donorPrefix,
                DonorFirstName: formData.donorFirstName,
                DonorMiddleName: formData.donorMiddleName,
                DonorLastName: formData.donorLastName,
                DonorSuffix: formData.donorSuffix,
                DonorAddress: formData.donorAddress,
                DonorCity: formData.donorCity,
                DonorState: formData.donorState,
                DonorZip: formData.donorZip,
                DonorEmployer: formData.donorEmployer,
                DonorOccupation: formData.donorOccupation,
                DonorPhone: formData.donorPhone,
                DonorEmail: formData.donorEmail,
                OrganizationName: formData.organizationName,

                GiftPledgeAmount: parseFloat(formData.pledgeAmount) || 0,
                GiftFee: parseFloat(formData.giftFee) || 0,
                GiftCustodian: formData.giftCustodian,
                GiftConduit: formData.giftConduit,
                PostMarkYear: parseInt(formData.postMarkYear),
                PostMarkQuarter: formData.postMarkQuarter,
                IsInactive: formData.isInactive === 'True',
                Comment: formData.comment
            };

            let res;
            if (editingId) {
                // UPDATE
                res = await fetch(`/api/donations/${editingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // CREATE
                res = await fetch(`/api/batches/${id}/donations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // POST route expects camelCase. We need to maintain compatibility or update POST.
                        // Let's send BOTH sets of keys to be safe, or check POST route.
                        // Checked POST route: expects lowerCamelCase keys like 'amount', 'donorFirstName' etc.
                        // BUT our PUT route expects PascalCase.
                        // We will send the payload merged with formData to cover bases.
                        ...formData,
                        amount: parseFloat(formData.amount), // Override string
                        // ... other fields are already in formData
                    })
                });
            }

            if (res.ok) {
                const newRecord = await res.json();
                setLastSavedId(newRecord.DonationID);
                setEditingId(null); // Clear edit mode
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
        resetForm,
        editingId,
        loadRecord
    };
}
