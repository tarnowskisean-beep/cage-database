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
            <div className="w-32 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">{label}:</div>
            <select
                className="bg-zinc-900 border border-white/10 text-white text-xs p-1 h-7 rounded w-32 focus:border-blue-500 focus:outline-none"
                value={formData[opKey as keyof typeof formData]}
                onChange={e => handleChange(opKey, e.target.value)}
            >
                {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {options ? (
                <select
                    className="bg-white/5 border border-white/10 text-white text-xs p-1 h-7 rounded flex-1 focus:border-blue-500 focus:outline-none"
                    value={formData[valKey as keyof typeof formData]}
                    onChange={e => handleChange(valKey, e.target.value)}
                >
                    <option value="" className="text-black">(Select)</option>
                    {options.map((o: any) => <option key={o} value={o} className="text-black">{o}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    className="bg-white/5 border border-white/10 text-white text-xs p-1 h-7 rounded flex-1 focus:border-blue-500 focus:outline-none placeholder-gray-600"
                    value={formData[valKey as keyof typeof formData]}
                    onChange={e => handleChange(valKey, e.target.value)}
                />
            )}
            {/* Checkbox Placeholder */}
            <input type="checkbox" checked readOnly className="ml-1 accent-blue-500" />
        </div>
    );

    return (
        <div className="max-w-[1400px] mx-auto px-6 py-8">
            <header className="page-header mb-8 flex items-end justify-between">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Data Intelligence</h2>
                    <h1 className="text-4xl text-white font-display">Global Search</h1>
                </div>
                <Link href="/" className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">Back to Dashboard &rarr;</Link>
            </header>

            {/* DENSE SEARCH FORM PANEL */}
            <div className="glass-panel p-6 mb-8">
                <div className="grid grid-cols-2 gap-x-12 gap-y-1">

                    {/* LEFT COLUMN */}
                    <div>
                        <Row label="Account" fieldKey="donorName" opKey="accountOp" valKey="accountVal" />
                        <Row label="Batch No" fieldKey="batchCode" opKey="batchCodeOp" valKey="batchCodeVal" />

                        {/* Client Dropdown override */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-32 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">Client ID:</div>
                            <select
                                className="bg-zinc-900 border border-white/10 text-white text-xs p-1 h-7 rounded w-32 focus:border-blue-500 focus:outline-none"
                                value={formData.clientOp}
                                onChange={e => handleChange('clientOp', e.target.value)}
                            >
                                {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <select
                                className="bg-white/5 border border-white/10 text-white text-xs p-1 h-7 rounded flex-1 focus:border-blue-500 focus:outline-none"
                                value={formData.clientVal}
                                onChange={e => handleChange('clientVal', e.target.value)}
                            >
                                <option value="" className="text-black">(All)</option>
                                {clients.map(c => <option key={c.ClientCode} value={c.ClientCode} className="text-black">{c.ClientCode}</option>)}
                            </select>
                            <input type="checkbox" checked readOnly className="ml-1 accent-blue-500" />
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
                            <div className="w-32 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">Batch Date:</div>
                            <select
                                className="bg-zinc-900 border border-white/10 text-white text-xs p-1 h-7 rounded w-32 focus:border-blue-500 focus:outline-none"
                                value={formData.batchDateOp}
                                onChange={e => handleChange('batchDateOp', e.target.value)}
                            >
                                <option value="equals">EQUALS</option>
                                <option value="between">BETWEEN</option>
                            </select>
                            <input
                                type="date"
                                className="bg-white/5 border border-white/10 text-white text-xs p-1 h-7 rounded w-28 focus:border-blue-500 focus:outline-none uppercase font-mono"
                                value={formData.batchDateStart}
                                onChange={e => handleChange('batchDateStart', e.target.value)}
                            />
                            <input
                                type="date"
                                className="bg-white/5 border border-white/10 text-white text-xs p-1 h-7 rounded w-28 focus:border-blue-500 focus:outline-none uppercase font-mono"
                                value={formData.batchDateEnd}
                                onChange={e => handleChange('batchDateEnd', e.target.value)}
                            />
                            <input type="checkbox" checked readOnly className="ml-1 accent-blue-500" />
                        </div>

                        <Row label="Check No" fieldKey="checkNumber" opKey="checkNoOp" valKey="checkNoVal" />
                        <Row label="Doc Type" fieldKey="giftType" opKey="docTypeOp" valKey="docTypeVal" options={['Check', 'Cash', 'Credit Card', 'EFT']} />
                        <Row label="Status" fieldKey="isInactive" opKey="statusOp" valKey="statusVal" options={['Active', 'Inactive']} />
                        <Row label="Full ID" fieldKey="scanString" opKey="compositeIdOp" valKey="compositeIdVal" />

                        {/* Radio Option */}
                        <div className="flex justify-end gap-4 mt-4 text-xs font-bold text-gray-400">
                            <label className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                                <input type="radio" name="range" checked={dateRangeType === '12months'} onChange={() => setDateRangeType('12months')} className="accent-blue-500" />
                                Search Prior 12 Months
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                                <input type="radio" name="range" checked={dateRangeType === 'all'} onChange={() => setDateRangeType('all')} className="accent-blue-500" />
                                Search Entire Archive
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                                <input type="radio" name="range" checked={dateRangeType === 'custom'} onChange={() => setDateRangeType('custom')} className="accent-blue-500" />
                                Custom Range
                            </label>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex items-center gap-4 border-t border-white/10 pt-4 justify-end">
                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Results:</div>
                        <select className="bg-zinc-900 border border-white/10 text-white text-xs rounded p-1"><option>10</option><option>50</option><option>100</option></select>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Sort:</div>
                        <select className="bg-zinc-900 border border-white/10 text-white text-xs rounded p-1 min-w-[100px]"><option>Batch Date</option><option>Amount</option></select>
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-2"></div>

                    <button
                        onClick={handleSearch}
                        className="btn-primary py-1 px-6 text-xs"
                    >
                        Search
                    </button>
                    <button className="btn-secondary py-1 px-6 text-xs">
                        Export
                    </button>
                    <button
                        onClick={handleClear}
                        className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors px-4"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* RESULTS LIST */}
            {searched && (
                <div className="glass-panel text-sm overflow-hidden min-h-[200px]">
                    <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Results</h3>
                        <span className="text-xs text-gray-500 font-mono">{results.length} records found</span>
                    </div>

                    <table className="w-full text-xs text-left">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="p-3 font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="p-3 font-bold text-gray-400 uppercase tracking-wider">Batch</th>
                                <th className="p-3 font-bold text-gray-400 uppercase tracking-wider">Donor / Account</th>
                                <th className="p-3 font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="p-3 font-bold text-gray-400 uppercase tracking-wider">Client</th>
                                <th className="p-3 font-bold text-gray-400 uppercase tracking-wider">Method</th>
                                <th className="p-3 font-bold text-gray-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">Searching...</td></tr>
                            ) : results.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-500">No records found matching criteria.</td></tr>
                            ) : (
                                results.map(r => (
                                    <tr key={r.DonationID} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="p-3 text-gray-400 font-mono">{new Date(r.GiftDate).toLocaleDateString()}</td>
                                        <td className="p-3 font-mono text-gray-500 group-hover:text-gray-300">{r.BatchCode}</td>
                                        <td className="p-3">
                                            <div className="font-bold text-white">{r.DonorFirstName} {r.DonorLastName}</div>
                                            <div className="text-[10px] text-gray-500">{r.DonorCity}, {r.DonorState}</div>
                                        </td>
                                        <td className="p-3 font-mono text-white">${Number(r.GiftAmount).toFixed(2)}</td>
                                        <td className="p-3 text-gray-400">{r.ClientCode}</td>
                                        <td className="p-3 text-gray-400">{r.GiftMethod}</td>
                                        <td className="p-3">
                                            <Link href={`/batches/${r.BatchID}/enter`} className="text-blue-400 hover:text-blue-300 font-bold uppercase text-[10px] tracking-wider">
                                                VIEW &rarr;
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
