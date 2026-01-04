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
    // Helper to map Batch Category to strict Gift Method
    const getForcedMethod = (category: string) => {
        switch (category) {
            case 'Checks': return 'Check';
            case 'Cash': return 'Cash';
            case 'CC': return 'Credit Card';
            case 'EFT': return 'EFT';
            default: return null; // Mixed or Zeros or others allow selection
        }
    };

    const fetchBatch = useCallback(async () => {
        try {
            const res = await fetch(`/api/batches/${id}`);
            if (res.ok) {
                const data = await res.json();
                setBatch(data);

                // Determine forced method
                const forced = getForcedMethod(data.PaymentCategory);
                const defaultMethod = forced || data.DefaultGiftMethod || 'Check';

                // Initialize defaults
                setFormData(prev => ({
                    ...prev,
                    platform: data.DefaultGiftPlatform || 'Cage',
                    giftType: data.DefaultGiftType || 'Individual/Trust/IRA',
                    method: defaultMethod,
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
    const handleScanLookup = async () => {
        const scan = formData.scanString; // Don't trim immediately, tabs matter depending on scanner config, but usually safe to trim ends.
        if (!scan) return;

        console.log("Processing Scan:", scan.replace(/\t/g, '[TAB]'));

        // DETECT SCAN TYPE
        // METHOD B: Datamatrix (Contains Tabs)
        if (scan.includes('\t')) {
            console.log("Detected Datamatrix (Tab-delimited)");
            const parts = scan.split('\t');

            // Expected Format (based on common standards or previous context):
            // 0: MailCode
            // 1: CagingID / MasterID
            // 2: Prefix
            // 3: FirstName
            // 4: MiddleName
            // 5: LastName
            // 6: Suffix
            // 7: Address
            // 8: City
            // 9: State
            // 10: Zip
            // 11+: Extra params?

            // For safety, let's map loosely by index
            const [
                mailCode,
                cagingId,
                prefix,
                first,
                middle,
                last,
                suffix,
                address,
                city,
                state,
                zip
            ] = parts;

            setFormData(prev => ({
                ...prev,
                mailCode: mailCode || '',
                // If CagingID is present, we might technically lookup more info, 
                // but usually the scan contains the Truth.
                // We'll also treat CagingID as the checkNumber fallback if needed? 
                // No, usually Check# is manually keyed for checks.

                donorPrefix: prefix || '',
                donorFirstName: first || '',
                donorMiddleName: middle || '',
                donorLastName: last || '',
                donorSuffix: suffix || '',

                donorAddress: address || '',
                donorCity: city || '',
                donorState: state || '',
                donorZip: zip || '',

                // Clear scan string or keep it? 
                // Usually we keep it for reference.
            }));

            // Focus Amount
            amountRef.current?.focus();
            return;
        }

        // METHOD A: Barcode / Manual Lookup (Single Key)
        console.log("Detected Barcode/Key Lookup");
        try {
            const res = await fetch(`/api/lookup/caging/${encodeURIComponent(scan.trim())}`);
            if (res.ok) {
                const data = await res.json();
                if (data.found && data.record) {
                    const rec = data.record;
                    setFormData(prev => ({
                        ...prev,
                        donorFirstName: rec.FirstName || '',
                        donorLastName: rec.LastName || '',
                        donorAddress: rec.Address || '',
                        donorCity: rec.City || '',
                        donorState: rec.State || '',
                        donorZip: rec.Zip || '',
                        mailCode: rec.MailCode || '',
                    }));
                } else {
                    console.log("No match found in prospects.");
                    alert(`No prospect found for ID: ${scan.trim()}`);
                }
            } else {
                alert(`Lookup failed. Server returned ${res.status}`);
            }
        } catch (e) {
            console.error("Lookup failed", e);
            alert("Lookup failed due to network error.");
        }

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

        // Conditional Validation based on Gift Type
        const giftType = formData.giftType;
        const requiresOrgName = ['Corporate', 'Foundation', 'Donor-Advised Fund'].includes(giftType);

        if (requiresOrgName && !formData.organizationName) {
            return alert(`Organization Name is required for ${giftType}.`);
        }

        if (giftType === 'Donor-Advised Fund' && !formData.giftCustodian) {
            return alert("Gift Custodian is required for Donor-Advised Funds.");
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                giftPledgeAmount: parseFloat(formData.pledgeAmount) || 0,
                giftFee: parseFloat(formData.giftFee) || 0,
                isInactive: formData.isInactive === 'True',
                checkNumber: formData.checkNumber || formData.scanString,

                // Mapped for Backend API
                GiftAmount: parseFloat(formData.amount),
                SecondaryID: formData.checkNumber || formData.scanString,
                CheckNumber: formData.checkNumber || formData.scanString,
                ScanString: formData.scanString,
                GiftMethod: formData.method,
                GiftPlatform: formData.platform,
                GiftType: formData.giftType,
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
                // CREATE - USE POST BYPASS ROUTE
                res = await fetch(`/api/save-donation`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, batchId: id }) // ADD BATCH ID TO BODY
                });
            }

            if (res.ok) {
                const newRecord = await res.json();
                setLastSavedId(newRecord.DonationID);
                setEditingId(null); // Clear edit mode
                await fetchRecords();

                // RESET FORM
                const forced = batch ? getForcedMethod(batch.PaymentCategory) : null;
                setFormData(prev => ({
                    ...initialFormState,
                    platform: prev.platform,
                    giftType: prev.giftType,
                    method: forced || prev.method,
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
                const text = await res.text();
                let errorMsg = `Status: ${res.status}`;
                try {
                    const data = JSON.parse(text);
                    errorMsg += ` - ${data.error || ''} ${data.details || ''}`;
                } catch {
                    errorMsg += ` - ${text.substring(0, 100)}`;
                }
                console.error('Save failed:', errorMsg);
                alert(`Failed to save: ${errorMsg}`);
            }
        } catch (e: any) {
            console.error(e);
            alert(`Error saving: ${e.message}`);
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
