'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- TYPES (Internal to map to Backend) ---
type Operator = 'AND' | 'OR';
type RuleOperator = 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq';

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
    BatchCode: string;
    BatchID: number;
    MailCode?: string; // Added from DB column
    // Export Fields
    ScanString?: string;
    ClientID?: number;
    CreatedAt?: string;
    DonorPrefix?: string;
    DonorMiddleName?: string;
    DonorSuffix?: string;
    DonorAddress?: string;
    DonorZip?: string;
    DonorPhone?: string;
    DonorEmail?: string;
    DonorEmployer?: string;
    DonorOccupation?: string;
    GiftType?: string;
    GiftPlatform?: string;
    OrganizationName?: string;
    GiftCustodian?: string;
    GiftFee?: number;
    GiftPledgeAmount?: number;
    IsInactive?: boolean;
    GiftYear?: number;
    GiftQuarter?: string;
    GiftConduit?: string;
    Comment?: string;
}

// --- HELPER: Date Logic ---
const getWeeklyRange = () => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 6 is Saturday

    // Find most recent Saturday (Start of current week cycle)
    const diff = (day + 1) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - diff);

    // End is start + 7 days (Saturday) to buffer for UTC overlap
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return {
        start: formatDate(start),
        end: formatDate(end)
    };
};

export default function SearchPage() {
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [clients, setClients] = useState<{ ClientID: number, ClientCode: string, ClientName: string }[]>([]);

    // Simple Filters State
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [clientCode, setClientCode] = useState('');
    const [donorName, setDonorName] = useState('');
    const [amountMin, setAmountMin] = useState('');
    const [amountMax, setAmountMax] = useState('');
    const [checkNumber, setCheckNumber] = useState('');

    // Advanced Query Logic
    // We need to extend the type locally for UI state (with IDs)
    interface UISearchRule extends SearchRule { id: string; }
    interface UISearchGroup { id: string; combinator: Operator; rules: (UISearchRule | UISearchGroup)[] }

    const [uiQuery, setUiQuery] = useState<UISearchGroup>({
        id: 'root',
        combinator: 'AND',
        rules: []
    });
    const [showAdvanced, setShowAdvanced] = useState(false);

    // --- RECURSIVE UPDATE HELPERS ---
    const updateUIGroup = (group: UISearchGroup, targetId: string, transform: (g: UISearchGroup) => UISearchGroup): UISearchGroup => {
        if (group.id === targetId) return transform(group);
        return {
            ...group,
            rules: group.rules.map(r => {
                if ('combinator' in r) return updateUIGroup(r as UISearchGroup, targetId, transform);
                return r;
            })
        };
    };

    const updateUIRule = (group: UISearchGroup, ruleId: string, transform: (r: UISearchRule) => UISearchRule): UISearchGroup => {
        return {
            ...group,
            rules: group.rules.map(r => {
                if ('combinator' in r) return updateUIRule(r as UISearchGroup, ruleId, transform);
                // @ts-ignore
                if (r.id === ruleId) return transform(r as UISearchRule);
                return r;
            })
        };
    };

    const addRuleToGroup = (group: UISearchGroup, targetGroupId: string): UISearchGroup => {
        if (group.id === targetGroupId) {
            return {
                ...group,
                rules: [...group.rules, { id: `rule-${Math.random()}`, field: 'donorName', operator: 'contains', value: '' }]
            };
        }
        return {
            ...group,
            rules: group.rules.map(r => {
                if ('combinator' in r) return addRuleToGroup(r as UISearchGroup, targetGroupId);
                return r;
            })
        };
    };

    const removeNode = (group: UISearchGroup, targetId: string): UISearchGroup => {
        return {
            ...group,
            rules: group.rules
                .filter(r => (r as any).id !== targetId)
                .map(r => {
                    if ('combinator' in r) return removeNode(r as UISearchGroup, targetId);
                    return r;
                })
        };
    };

    // Constants
    const FIELDS = [
        { value: 'donorName', label: 'Donor Name' },
        { value: 'amount', label: 'Gift Amount' },
        { value: 'date', label: 'Gift Date' },
        { value: 'method', label: 'Payment Method' },
        { value: 'platform', label: 'Platform' },
        { value: 'checkNumber', label: 'Check Number' },
        { value: 'compositeId', label: 'Composite ID' }, // Added
        { value: 'donorCity', label: 'City' },
        { value: 'donorState', label: 'State' },
        { value: 'donorZip', label: 'Zip Code' },
        { value: 'donorEmail', label: 'Email' },
        { value: 'donorEmployer', label: 'Employer' },
        { value: 'donorOccupation', label: 'Occupation' },
        { value: 'orgName', label: 'Organization' },
        { value: 'comment', label: 'Comment' },
        { value: 'clientCode', label: 'Client Code' },
        { value: 'batchCode', label: 'Batch Code' },
    ];

    const OPERATORS = [
        { value: 'equals', label: 'Equals' },
        { value: 'contains', label: 'Contains' },
        { value: 'neq', label: 'Does Not Equal' },
        { value: 'gt', label: 'Greater Than' },
        { value: 'lt', label: 'Less Than' },
        { value: 'gte', label: 'Greater/Equal' },
        { value: 'lte', label: 'Less/Equal' },
    ];

    // --- RENDERERS ---
    const renderRule = (rule: UISearchRule) => (
        <div key={rule.id} className="flex gap-2 items-center mb-2">
            <select
                className="input-field w-32"
                value={rule.field}
                onChange={e => setUiQuery(prev => updateUIRule(prev, rule.id, r => ({ ...r, field: e.target.value })))}
            >
                {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            <select
                className="input-field w-32"
                value={rule.operator}
                onChange={e => setUiQuery(prev => updateUIRule(prev, rule.id, r => ({ ...r, operator: e.target.value as RuleOperator })))}
            >
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <input
                className="input-field w-48"
                value={rule.value}
                onChange={e => setUiQuery(prev => updateUIRule(prev, rule.id, r => ({ ...r, value: e.target.value })))}
                placeholder="Value..."
            />

            <button
                onClick={() => setUiQuery(prev => removeNode(prev, rule.id))}
                className="text-gray-500 hover:text-red-400 text-xl font-bold px-2"
                title="Remove Rule"
            >
                &times;
            </button>
        </div>
    );

    const renderGroup = (group: UISearchGroup, isRoot = false) => (
        <div key={group.id} className={`p-4 rounded-lg mb-4 ${isRoot ? '' : 'bg-white/5 border border-white/10'}`}>
            <div className="flex gap-4 mb-2 items-center">
                <span className="font-semibold text-gray-500 text-xs uppercase tracking-widest">{isRoot ? 'LOGIC ROOT' : 'GROUP'}:</span>
                <select
                    className="input-field w-24 font-bold text-white bg-zinc-800"
                    value={group.combinator}
                    onChange={e => setUiQuery(prev => updateUIGroup(prev, group.id, g => ({ ...g, combinator: e.target.value as Operator })))}
                >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                </select>

                <div className="flex-1"></div>

                <button
                    onClick={() => setUiQuery(prev => addRuleToGroup(prev, group.id))}
                    className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-white transition-colors uppercase tracking-wider font-bold"
                >
                    + Add Rule
                </button>
            </div>

            <div className={`pl-4 ${isRoot ? '' : 'border-l border-white/10'}`}>
                {group.rules.map(item => {
                    if ('combinator' in item) return renderGroup(item as UISearchGroup);
                    // @ts-ignore
                    return renderRule(item as UISearchRule);
                })}
            </div>
        </div>
    );

    useEffect(() => {
        // Set Default Dates
        const range = getWeeklyRange();
        setStartDate(range.start);
        setEndDate(range.end);

        // Fetch Clients for dropdown
        fetch('/api/clients', { cache: 'no-store' })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setClients(data);
                } else {
                    console.error("Clients API returned non-array:", data);
                    setClients([]);
                }
            })
            .catch(err => {
                console.error("Failed to fetch clients:", err);
                setClients([]);
            });
    }, []);

    const handleSearch = async () => {
        setLoading(true);
        setSearched(true);
        try {
            // 1. Build Standard Rules
            const standardRules: SearchRule[] = [];
            if (startDate) standardRules.push({ field: 'date', operator: 'gte', value: startDate });
            if (endDate) standardRules.push({ field: 'date', operator: 'lte', value: endDate + ' 23:59:59' });
            if (clientCode) standardRules.push({ field: 'clientCode', operator: 'equals', value: clientCode });
            if (donorName) standardRules.push({ field: 'donorName', operator: 'contains', value: donorName });
            if (amountMin) standardRules.push({ field: 'amount', operator: 'gte', value: Number(amountMin) });
            if (amountMax) standardRules.push({ field: 'amount', operator: 'lte', value: Number(amountMax) });
            if (checkNumber) standardRules.push({ field: 'checkNumber', operator: 'contains', value: checkNumber });

            // 2. Convert UI Query (with IDs) to Backend Query (clean)
            const cleanIndices = (g: UISearchGroup): SearchGroup => ({
                combinator: g.combinator,
                rules: g.rules.map(r => {
                    if ('combinator' in r) return cleanIndices(r as UISearchGroup);
                    const rule = r as UISearchRule;
                    return { field: rule.field, operator: rule.operator, value: rule.value };
                })
            });
            const advancedPart = cleanIndices(uiQuery);

            // 3. Merge: Top Level is AND ( Standard Rules AND (Advanced Logic) )
            // If no advanced rules exist, just send standard.
            // If only advanced, send advanced.

            const finalRules: (SearchRule | SearchGroup)[] = [...standardRules];

            // Only add advanced block if it has rules
            if (advancedPart.rules.length > 0) {
                finalRules.push(advancedPart);
            }

            const query: SearchGroup = {
                combinator: 'AND',
                rules: finalRules
            };

            const res = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(query)
            });
            const data = await res.json();
            const rows = Array.isArray(data) ? data : [];
            setResults(rows);
        } catch (e) {
            console.error(e);
            alert('Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleExportCSV = () => {
        if (!results || results.length === 0) return alert('No results to export');

        // Headers
        const headers = [
            'DonationID', 'ClientID', 'Date Created', 'CagingID', 'MailCode', 'Composite ID', 'Prefix',
            'First Name', 'Middle Name', 'Last Name', 'Suffix', 'Address', 'City', 'State', 'Zip',
            'Phone', 'Email', 'Occupation', 'Employer',
            'Gift Type', 'Gift Method', 'Gift Platform', 'Gift Organization', 'Gift Custodian',
            'Gift Amount', 'Gift Fee', 'Pledge Amount', 'Yes Inactive',
            'Gift Year', 'Gift Quarter',
            'Conduit', 'Comment', 'BatchID', 'Batch Date',
            'CC Account#', 'CC CVV#', 'CC Expiration Date'
        ];

        // Mapped Rows
        const csvRows = results.map(r => {
            const esc = (val: string | number | null | undefined) => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const rec = r as any;

            // 1. Get explicit ScanString
            let scanString = rec.ScanString || rec.scanString || rec.scanstring || '';

            // 2. Fallback: Generate Composite ID if missing
            // Priority: Explicit ScanString -> Full Batch Code -> Constructed Legacy Code
            if (!scanString && rec.BatchCode) {
                // Check if BatchCode is already the full Composite ID (New System)
                // e.g. "AFL.CB.2025..." (contains ClientCode)
                if (rec.BatchCode.includes(rec.ClientCode) && rec.BatchCode.split('.').length >= 4) {
                    scanString = rec.BatchCode;
                } else {
                    // Start of OLD/LEGACY generation for short codes
                    const rawDate = rec.BatchDate || rec.GiftDate || new Date().toISOString();
                    const d = new Date(rawDate);
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const dateStr = `${yyyy}.${mm}.${dd}`;

                    // Platform Abbreviation Mapping
                    const platform = rec.GiftPlatform || rec.giftPlatform || 'Cage';
                    const abbreviations: Record<string, string> = {
                        'Chainbridge': 'CB',
                        'Stripe': 'ST',
                        'National Capital': 'NC',
                        'City National': 'CN',
                        'Propay': 'PP',
                        'Anedot': 'AN',
                        'Winred': 'WR',
                        'Cage': 'CG',
                        'Import': 'IM'
                    };
                    // Default to first 2 chars upper-case if not found
                    const platCode = abbreviations[platform] || platform.substring(0, 2).toUpperCase();

                    scanString = `${rec.ClientCode}.${platCode}.${dateStr}.${rec.BatchCode}`;
                }
            }

            let mailCode = rec.MailCode || '';
            if (!mailCode && scanString && scanString.includes('\t')) {
                mailCode = scanString.split('\t')[0];
            }

            return [
                esc(rec.DonationID),
                esc(rec.ClientCode),
                esc(rec.CreatedAt ? new Date(rec.CreatedAt).toLocaleDateString('en-US') : ''),
                esc(rec.DonationID),
                esc(mailCode),
                esc(scanString), // Composite ID
                esc(rec.DonorPrefix),

                esc(rec.DonorFirstName),
                esc(rec.DonorMiddleName),
                esc(rec.DonorLastName),
                esc(rec.DonorSuffix),
                esc(rec.DonorAddress),
                esc(rec.DonorCity),
                esc(rec.DonorState),
                esc(rec.DonorZip),
                esc(rec.DonorPhone),
                esc(rec.DonorEmail),
                esc(rec.DonorOccupation),
                esc(rec.DonorEmployer),
                esc(rec.GiftType),
                esc(rec.GiftMethod),
                esc(rec.GiftPlatform),
                esc(rec.OrganizationName),
                esc(rec.GiftCustodian),
                esc(Number(rec.GiftAmount || 0).toFixed(2)),
                esc(Number(rec.GiftFee || 0).toFixed(2)),
                esc(Number(rec.GiftPledgeAmount || 0).toFixed(2)),
                esc(rec.IsInactive ? 'Yes' : 'No'),
                esc(rec.GiftYear),
                esc(rec.GiftQuarter),
                esc(rec.GiftConduit),
                esc(rec.Comment),
                esc(rec.BatchID),
                esc(rec.BatchCode),
                '', '', ''
            ].join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `search_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();

        // SOC 2 Audit Log
        fetch('/api/audit/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'ExportCSV',
                details: `Exported ${results.length} records. Filters: ${JSON.stringify({ clientCode, startDate, endDate })}`
            })
        }).catch(err => console.error('Audit Log Failed', err));
    };

    const handleGenerateReport = () => {
        if (!searched) return alert('Please run a search first.');
        // We need to reconstruct the query for the report URL too
        const standardRules: SearchRule[] = [];
        if (startDate) standardRules.push({ field: 'date', operator: 'gte', value: startDate });
        if (endDate) standardRules.push({ field: 'date', operator: 'lte', value: endDate + ' 23:59:59' });
        if (clientCode) standardRules.push({ field: 'clientCode', operator: 'equals', value: clientCode });
        if (donorName) standardRules.push({ field: 'donorName', operator: 'contains', value: donorName });
        if (amountMin) standardRules.push({ field: 'amount', operator: 'gte', value: Number(amountMin) });
        if (amountMax) standardRules.push({ field: 'amount', operator: 'lte', value: Number(amountMax) });
        if (checkNumber) standardRules.push({ field: 'checkNumber', operator: 'contains', value: checkNumber });

        const cleanIndices = (g: UISearchGroup): SearchGroup => ({
            combinator: g.combinator,
            rules: g.rules.map(r => {
                if ('combinator' in r) return cleanIndices(r as UISearchGroup);
                const rule = r as UISearchRule;
                return { field: rule.field, operator: rule.operator, value: rule.value };
            })
        });
        const advancedPart = cleanIndices(uiQuery);

        const finalRules: (SearchRule | SearchGroup)[] = [...standardRules];
        if (advancedPart.rules.length > 0) {
            finalRules.push(advancedPart);
        }

        const query: SearchGroup = {
            combinator: 'AND',
            rules: finalRules
        };

        const queryPayload = {
            ...query,
            startDate,
            endDate
        };

        const url = `/search/report?q=${encodeURIComponent(JSON.stringify(queryPayload))}`;
        window.open(url, '_blank');
    };

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8">
            <header className="page-header mb-8 flex items-end justify-between">
                <div>
                    <h2 className="text-sm font-medium tracking-wide text-gray-400 uppercase mb-2">Data Intelligence</h2>
                    <h1 className="text-4xl text-white font-display">Global Search</h1>
                </div>
                <Link href="/" className="text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">Back to Dashboard &rarr;</Link>
            </header>

            {/* Filtering */}
            <div className="glass-panel p-6 mb-8">
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-white">
                        <span className="text-xl">🔍</span>
                        <span className="font-semibold text-xs uppercase tracking-wider">Parameters</span>
                    </div>

                    {/* Client */}
                    <select
                        className="input-field min-w-[200px]"
                        value={clientCode}
                        onChange={e => setClientCode(e.target.value)}
                    >
                        <option value="">All Clients</option>
                        {clients.map(c => (
                            <option key={c.ClientID} value={c.ClientCode}>{c.ClientCode} - {c.ClientName}</option>
                        ))}
                    </select>

                    {/* Date Range */}
                    <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded border border-white/5">
                        <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest px-2">From</span>
                        <input
                            type="date"
                            className="bg-transparent text-white text-xs outline-none uppercase font-mono"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                        />
                        <span className="text-gray-700">|</span>
                        <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest px-2">To</span>
                        <input
                            type="date"
                            className="bg-transparent text-white text-xs outline-none uppercase font-mono"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                        />
                    </div>

                    <div className="flex-1"></div>

                    <div className="flex gap-2">
                        <button className="btn-primary" onClick={handleSearch} disabled={loading}>
                            {loading ? 'Searching...' : 'Run Search'}
                        </button>
                        {(
                            <button
                                onClick={() => {
                                    setClientCode('');
                                    setStartDate('');
                                    setEndDate('');
                                    setCheckNumber('');
                                    setDonorName('');
                                    setAmountMin('');
                                    setAmountMax('');
                                    setUiQuery({ id: 'root', combinator: 'AND', rules: [] });
                                }}
                                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Advanced Filters Toggle */}
                <div className="mt-6 border-t border-[var(--glass-border)] pt-4">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide"
                    >
                        {showAdvanced ? '▼ Hide Advanced Rules' : '▶ Advanced Logic'}
                    </button>

                    {showAdvanced && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-1">
                            {renderGroup(uiQuery, true)}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons Row (Only if results exist) */}
            {results.length > 0 && (
                <div className="flex justify-end gap-3 mb-4">
                    <button className="btn-secondary" onClick={handleExportCSV}>
                        <span>⬇</span> CSV
                    </button>
                    <button className="btn-secondary" onClick={handleGenerateReport}>
                        <span>📄</span> PDF Report
                    </button>
                </div>
            )}

            {/* Results Table */}
            {searched && (
                <div className="glass-panel text-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--glass-border)] bg-white/5 flex justify-between">
                        <h3 className="text-white font-medium">Search Results</h3>
                        <span className="text-gray-500 text-xs font-mono">{results.length} matches</span>
                    </div>
                    {results.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">No matches found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Donor</th>
                                        <th>Amount</th>
                                        <th>Method</th>
                                        <th>Client</th>
                                        <th>Batch</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map(r => (
                                        <tr key={r.DonationID} className="group hover:bg-white/5 transition-colors">
                                            <td className="text-gray-400 font-mono text-xs">{new Date(r.GiftDate).toLocaleDateString()}</td>
                                            <td>
                                                <div className="font-medium text-white">{r.DonorFirstName} {r.DonorLastName}</div>
                                                <div className="text-xs text-gray-500">{r.DonorCity}, {r.DonorState}</div>
                                            </td>
                                            <td className="font-mono text-white font-medium">
                                                ${Number(r.GiftAmount).toFixed(2)}
                                            </td>
                                            <td className="text-gray-400">{r.GiftMethod}</td>
                                            <td className="text-white font-mono text-xs">{r.ClientCode}</td>
                                            <td className="font-mono text-xs text-gray-500">{r.BatchCode}</td>
                                            <td>
                                                <Link href={`/batches/${r.BatchID}/enter`} className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-wide">
                                                    View &rarr;
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
