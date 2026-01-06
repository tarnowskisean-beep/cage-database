'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- TYPES (Internal to map to Backend) ---
type Operator = 'AND' | 'OR';
type RuleOperator = 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq' | 'beginsWith';

interface SearchRule {
    field: string;
    operator: RuleOperator;
    value: string | number;
}

interface SearchGroup {
    combinator: Operator;
    rules: (SearchRule | SearchGroup)[];
}

interface SearchResult {
    DonationID: number;
    GiftDate: string;
    DonorFirstName: string;
    DonorLastName: string;
    DonorCity: string;
    DonorState: string;
    GiftAmount: number;
    GiftMethod: string;
    ClientCode: string;
    BatchCode: string; // "Batch No"
    BatchID: number;
    MailCode?: string;
    ScanString?: string; // "Composite ID"
    // ... other fields as needed for display
    CheckNumber?: string;
    DonorZip?: string;
    GiftType?: string;
    IsInactive?: boolean;
}

// --- HELPER: Date Logic ---
const getWeeklyRange = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday
    const diff = (day + 1) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    return { start: formatDate(start), end: formatDate(end) };
};

export default function SearchPage() {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [clients, setClients] = useState<{ ClientID: number, ClientCode: string, ClientName: string }[]>([]);

    // --- FLAT FORM STATE ---
    // We store both the OPERATOR and the VALUE for each field.
    const [formData, setFormData] = useState({
        // Row 1
        clientOp: 'equals', clientVal: '',
        batchDateOp: 'equals', batchDateStart: '', batchDateEnd: '', // Date uses range implicitly often, but we can support op

        // Row 2
        batchCodeOp: 'equals', batchCodeVal: '',
        checkNoOp: 'contains', checkNoVal: '',

        // Row 3
        accountOp: 'contains', accountVal: '', // "Account" -> Donor Name / Org
        docTypeOp: 'equals', docTypeVal: '', // Gift Type

        // Row 4
        amountOp: 'equals', amountVal: '',
        zipCodeOp: 'beginsWith', zipCodeVal: '',

        // Row 5
        lastNameOp: 'beginsWith', lastNameVal: '',
        statusOp: 'equals', statusVal: '', // Active / Inactive

        // Row 6
        compositeIdOp: 'beginsWith', compositeIdVal: '',
        mailCodeOp: 'equals', mailCodeVal: ''
    });

    const [dateRangeType, setDateRangeType] = useState<'custom' | '12months' | 'all'>('custom');

    // Load Clients & Default Dates
    useEffect(() => {
        const range = getWeeklyRange();
        setFormData(prev => ({
            ...prev,
            batchDateStart: range.start,
            batchDateEnd: range.end
        }));

        fetch('/api/clients', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => Array.isArray(data) ? setClients(data) : setClients([]))
            .catch(err => console.error(err));
    }, []);

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSearch = async () => {
        setLoading(true);
        setSearched(true);
        try {
            const rules: SearchRule[] = [];

            // Helper to add rule if value exists
            const add = (field: string, op: string, val: string) => {
                if (!val) return;
                // Map frontend operators to backend if needed, or backend supports them
                // Backend likely supports: equals, contains, gt, lt, gte, lte, neq, beginsWith?
                // If backend only supports standard SQL, we might need to adjust 'beginsWith' -> 'like' 'val%' in API
                // For now, let's assume API handles standard set or we map 'beginsWith' to 'contains' if needed for safety,
                // BUT user specifically asked for "Begins With".
                // Let's pass 'beginsWith' and ensure backend handles it or we map it here.
                // Note: The previous file defined RuleOperator without 'beginsWith'. 
                // We'll map 'beginsWith' -> 'contains' effectively for now OR use 'gte'/'lte' for strings? 
                // Actually 'beginsWith' isn't in the Type at top. Let's add it to type or map it to 'contains' (which is ILIKE %val%)
                // *Correction*: User wants "Begins With". I will map it to 'beginsWith' in type and assume backend (Search API) can handle it 
                // OR I will fix backend in next step. For UI consistency, I'll send it.
                rules.push({ field, operator: op as RuleOperator, value: val });
            };

            // 1. Client
            add('clientCode', formData.clientOp, formData.clientVal);

            // 2. Batch Code
            add('batchCode', formData.batchCodeOp, formData.batchCodeVal);

            // 3. Account (Donor Name / Org) - Mapped to 'donorName'
            add('donorName', formData.accountOp, formData.accountVal);

            // 4. Amount
            add('amount', formData.amountOp, formData.amountVal);

            // 5. Last Name
            add('donorLastName', formData.lastNameOp, formData.lastNameVal);

            // 6. Zip
            add('donorZip', formData.zipCodeOp, formData.zipCodeVal);

            // 7. Check Number
            add('checkNumber', formData.checkNoOp, formData.checkNoVal);

            // 8. Doc Type
            add('giftType', formData.docTypeOp, formData.docTypeVal);

            // 9. Status (IsInactive)
            if (formData.statusVal === 'Inactive') add('isInactive', 'equals', 'true');
            if (formData.statusVal === 'Active') add('isInactive', 'equals', 'false');

            // 10. Composite ID
            // add('scanString', formData.compositeIdOp, formData.compositeIdVal); // Assuming backend maps scanString

            // 11. Mail Code
            add('mailCode', formData.mailCodeOp, formData.mailCodeVal);

            // Dates
            if (dateRangeType === 'custom') {
                if (formData.batchDateStart) rules.push({ field: 'date', operator: 'gte', value: formData.batchDateStart });
                if (formData.batchDateEnd) rules.push({ field: 'date', operator: 'lte', value: formData.batchDateEnd + ' 23:59:59' });
            } else if (dateRangeType === '12months') {
                const d = new Date();
                d.setFullYear(d.getFullYear() - 1);
                rules.push({ field: 'date', operator: 'gte', value: d.toISOString().split('T')[0] });
            }

            const query: SearchGroup = { combinator: 'AND', rules };

            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(query)
            });
            const data = await res.json();
            setResults(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            alert('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setFormData(prev => ({
            ...prev,
            clientVal: '', batchCodeVal: '', accountVal: '',
            amountVal: '', lastNameVal: '', zipCodeVal: '',
            checkNoVal: '', docTypeVal: '', statusVal: '',
            compositeIdVal: '', mailCodeVal: ''
        }));
        setResults([]);
        setSearched(false);
    };

    // --- RENDER HELPERS ---
    const OPERATOR_OPTIONS = [
        { value: 'equals', label: 'EQUALS' },
        { value: 'beginsWith', label: 'BEGINS WITH' },
        { value: 'contains', label: 'CONTAINS' },
        { value: 'gt', label: 'GREATER THAN' },
        { value: 'lt', label: 'LESS THAN' },
    ];

    const Row = ({ label, fieldKey, opKey, valKey, type = 'text', options = null }: any) => (
        <div className="flex items-center gap-2 mb-2">
            <div className="w-32 text-right text-sm font-bold text-gray-700">{label}:</div>
            <select
                className="bg-white border text-xs p-1 h-7 rounded border-gray-400 w-32"
                value={formData[opKey as keyof typeof formData]}
                onChange={e => handleChange(opKey, e.target.value)}
            >
                {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {options ? (
                <select
                    className="bg-white border text-xs p-1 h-7 rounded border-gray-400 flex-1"
                    value={formData[valKey as keyof typeof formData]}
                    onChange={e => handleChange(valKey, e.target.value)}
                >
                    <option value="">(Select)</option>
                    {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    className="bg-white border text-xs p-1 h-7 rounded border-gray-400 flex-1"
                    value={formData[valKey as keyof typeof formData]}
                    onChange={e => handleChange(valKey, e.target.value)}
                />
            )}
            {/* Checkbox Placeholder to match image style */}
            <input type="checkbox" checked readOnly className="ml-1" />
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto p-6 text-black">
            <header className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white">Search Records</h1>
                <Link href="/" className="text-gray-400 hover:text-white text-sm uppercase font-bold">Back to Dashboard</Link>
            </header>

            {/* DENSE SEARCH FORM PANEL */}
            <div className="bg-[#dbeafe] border border-blue-200 rounded p-4 mb-6 shadow-sm">
                <div className="grid grid-cols-2 gap-x-8 gap-y-1">

                    {/* LEFT COLUMN */}
                    <div>
                        <Row label="Account" fieldKey="donorName" opKey="accountOp" valKey="accountVal" />
                        <Row label="Batch No" fieldKey="batchCode" opKey="batchCodeOp" valKey="batchCodeVal" />

                        {/* Client Dropdown override */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-32 text-right text-sm font-bold text-gray-700">Client ID:</div>
                            <select
                                className="bg-white border text-xs p-1 h-7 rounded border-gray-400 w-32"
                                value={formData.clientOp}
                                onChange={e => handleChange('clientOp', e.target.value)}
                            >
                                {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <select
                                className="bg-white border text-xs p-1 h-7 rounded border-gray-400 flex-1"
                                value={formData.clientVal}
                                onChange={e => handleChange('clientVal', e.target.value)}
                            >
                                <option value="">(All)</option>
                                {clients.map(c => <option key={c.ClientCode} value={c.ClientCode}>{c.ClientCode}</option>)}
                            </select>
                            <input type="checkbox" checked readOnly className="ml-1" />
                        </div>

                        <Row label="Amount" fieldKey="amount" opKey="amountOp" valKey="amountVal" type="number" />
                        <Row label="Lastname" fieldKey="donorLastName" opKey="lastNameOp" valKey="lastNameVal" />
                        <Row label="ZipCode" fieldKey="donorZip" opKey="zipCodeOp" valKey="zipCodeVal" />
                        <Row label="Mail Code" fieldKey="mailCode" opKey="mailCodeOp" valKey="mailCodeVal" />
                    </div>

                    {/* RIGHT COLUMN */}
                    <div>
                        {/* Date - Custom Layout */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-32 text-right text-sm font-bold text-gray-700">Batch Date:</div>
                            <select
                                className="bg-white border text-xs p-1 h-7 rounded border-gray-400 w-32"
                                value={formData.batchDateOp}
                                onChange={e => handleChange('batchDateOp', e.target.value)}
                            >
                                <option value="equals">EQUALS</option>
                                <option value="between">BETWEEN</option>
                            </select>
                            <input
                                type="date"
                                className="bg-white border text-xs p-1 h-7 rounded border-gray-400 w-28"
                                value={formData.batchDateStart}
                                onChange={e => handleChange('batchDateStart', e.target.value)}
                            />
                            <input
                                type="date"
                                className="bg-white border text-xs p-1 h-7 rounded border-gray-400 w-28"
                                value={formData.batchDateEnd}
                                onChange={e => handleChange('batchDateEnd', e.target.value)}
                            />
                            <input type="checkbox" checked readOnly className="ml-1" />
                        </div>

                        <Row label="Check No" fieldKey="checkNumber" opKey="checkNoOp" valKey="checkNoVal" />
                        <Row label="Doc Type" fieldKey="giftType" opKey="docTypeOp" valKey="docTypeVal" options={['Check', 'Cash', 'Credit Card', 'EFT']} />
                        <Row label="Status" fieldKey="isInactive" opKey="statusOp" valKey="statusVal" options={['Active', 'Inactive']} />
                        <Row label="Full ID" fieldKey="scanString" opKey="compositeIdOp" valKey="compositeIdVal" />

                        {/* Radio Option */}
                        <div className="flex justify-end gap-2 mt-4 text-xs font-bold text-green-700">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" name="range" checked={dateRangeType === '12months'} onChange={() => setDateRangeType('12months')} />
                                Search Prior 12 Months
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" name="range" checked={dateRangeType === 'all'} onChange={() => setDateRangeType('all')} />
                                Search Entire Archive
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" name="range" checked={dateRangeType === 'custom'} onChange={() => setDateRangeType('custom')} />
                                Custom Range
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-blue-300 pt-3">
                    <div className="text-xs font-bold text-gray-600">Results Per Page:</div>
                    <select className="border text-xs rounded p-1"><option>10</option><option>50</option><option>100</option></select>

                    <div className="text-xs font-bold text-gray-600 ml-4">Sort Value:</div>
                    <select className="border text-xs rounded p-1 min-w-[100px]"><option>Batch Date</option><option>Amount</option></select>

                    <button
                        onClick={handleSearch}
                        className="ml-4 px-4 py-1 bg-white border border-gray-400 text-xs font-bold hover:bg-gray-50 active:bg-gray-100 rounded shadow-sm"
                    >
                        Search
                    </button>
                    <button className="px-4 py-1 bg-white border border-gray-400 text-xs font-bold hover:bg-gray-50 active:bg-gray-100 rounded shadow-sm">
                        Export
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-4 py-1 bg-white border border-gray-400 text-xs font-bold hover:bg-gray-50 active:bg-gray-100 rounded shadow-sm"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* RESULTS LIST */}
            {searched && (
                <div className="bg-white rounded shadow-sm overflow-hidden min-h-[200px]">
                    <div className="px-4 py-2 bg-gray-100 border-b flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-600 uppercase">Results</h3>
                        <span className="text-xs text-gray-500">{results.length} records found</span>
                    </div>

                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-2 font-bold text-gray-700">Date</th>
                                <th className="p-2 font-bold text-gray-700">Batch</th>
                                <th className="p-2 font-bold text-gray-700">Donor / Account</th>
                                <th className="p-2 font-bold text-gray-700">Amount</th>
                                <th className="p-2 font-bold text-gray-700">Client</th>
                                <th className="p-2 font-bold text-gray-700">Method</th>
                                <th className="p-2 font-bold text-gray-700">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Searching...</td></tr>
                            ) : results.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No records found matching criteria.</td></tr>
                            ) : (
                                results.map(r => (
                                    <tr key={r.DonationID} className="border-b hover:bg-blue-50 transition-colors">
                                        <td className="p-2">{new Date(r.GiftDate).toLocaleDateString()}</td>
                                        <td className="p-2 font-mono text-gray-600">{r.BatchCode}</td>
                                        <td className="p-2">
                                            <div className="font-bold">{r.DonorFirstName} {r.DonorLastName}</div>
                                            <div className="text-[10px] text-gray-500">{r.DonorCity}, {r.DonorState}</div>
                                        </td>
                                        <td className="p-2 font-mono">${Number(r.GiftAmount).toFixed(2)}</td>
                                        <td className="p-2">{r.ClientCode}</td>
                                        <td className="p-2">{r.GiftMethod}</td>
                                        <td className="p-2">
                                            <Link href={`/batches/${r.BatchID}/enter`} className="text-blue-600 hover:underline font-bold">
                                                VIEW
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
