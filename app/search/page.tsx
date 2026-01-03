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
        <div key={rule.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <select
                className="input-field"
                style={{ width: '150px' }}
                value={rule.field}
                onChange={e => setUiQuery(prev => updateUIRule(prev, rule.id, r => ({ ...r, field: e.target.value })))}
            >
                {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            <select
                className="input-field"
                style={{ width: '150px' }}
                value={rule.operator}
                onChange={e => setUiQuery(prev => updateUIRule(prev, rule.id, r => ({ ...r, operator: e.target.value as RuleOperator })))}
            >
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <input
                className="input-field"
                style={{ width: '200px' }}
                value={rule.value}
                onChange={e => setUiQuery(prev => updateUIRule(prev, rule.id, r => ({ ...r, value: e.target.value })))}
                placeholder="Value..."
            />

            <button
                onClick={() => setUiQuery(prev => removeNode(prev, rule.id))}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1.2rem' }}
                title="Remove Rule"
            >
                ×
            </button>
        </div>
    );

    const renderGroup = (group: UISearchGroup, isRoot = false) => (
        <div key={group.id} style={{
            padding: '1rem',
            border: isRoot ? 'none' : '1px solid var(--color-border)',
            background: isRoot ? 'transparent' : 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            position: 'relative'
        }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Logic Group:</span>
                <select
                    className="input-field"
                    style={{ width: '80px', fontWeight: 600, color: 'var(--color-primary)' }}
                    value={group.combinator}
                    onChange={e => setUiQuery(prev => updateUIGroup(prev, group.id, g => ({ ...g, combinator: e.target.value as Operator })))}
                >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                </select>

                <div style={{ flex: 1 }}></div>

                <button
                    onClick={() => setUiQuery(prev => addRuleToGroup(prev, group.id))}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', cursor: 'pointer', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-main)' }}
                >
                    + Rule
                </button>
            </div>

            <div style={{ paddingLeft: isRoot ? 0 : '1rem' }}>
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
        fetch('/api/clients')
            .then(res => res.json())
            .then(data => setClients(data))
            .catch(console.error);
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
            setResults(Array.isArray(data) ? data : []);
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
            'DonationID', 'ClientID', 'Date Created', 'CagingID', 'MailCode', 'Prefix',
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

            let mailCode = '';
            const rec = r as any;
            if (rec.ScanString && rec.ScanString.includes('\t')) {
                mailCode = rec.ScanString.split('\t')[0];
            }

            return [
                esc(rec.DonationID),
                esc(rec.ClientCode),
                esc(rec.CreatedAt ? new Date(rec.CreatedAt).toLocaleDateString('en-US') : ''),
                esc(rec.DonationID),
                esc(mailCode),
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
    };

    const handleGenerateReport = () => {
        if (!searched) return alert('Please run a search first.');
        // We need to reconstruct the query for the report URL too
        const standardRules: SearchRule[] = [];
        if (startDate) standardRules.push({ field: 'date', operator: 'gte', value: startDate });
        if (endDate) standardRules.push({ field: 'date', operator: 'lte', value: endDate });
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

        const url = `/search/report?q=${encodeURIComponent(JSON.stringify(query))}`;
        window.open(url, '_blank');
    };

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Search</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Search donations by date, donor, or client.</p>
                </div>
                <Link href="/" className="btn-secondary" style={{ textDecoration: 'none' }}>Back to Dashboard</Link>
            </header>

            {/* Simple Search Form matching Dashboard Style */}
            <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔍</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Filters:</span>
                </div>

                {/* Client */}
                <select
                    className="input-field"
                    style={{ width: 'auto', minWidth: '200px' }}
                    value={clientCode}
                    onChange={e => setClientCode(e.target.value)}
                >
                    <option value="">All Clients</option>
                    {clients.map(c => (
                        <option key={c.ClientID} value={c.ClientCode}>{c.ClientCode} - {c.ClientName}</option>
                    ))}
                </select>

                {/* Date Range */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>From</span>
                    <input
                        type="date"
                        className="input-field"
                        style={{ width: 'auto' }}
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>To</span>
                    <input
                        type="date"
                        className="input-field"
                        style={{ width: 'auto' }}
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        onMouseOver={(e) => { try { e.currentTarget.showPicker(); } catch (err) { } }}
                    />
                </div>

                {/* Filters Removed: Ref #, Donor Name, Min $, Max $ */}

                <div style={{ flex: 1 }}></div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-primary" onClick={handleSearch} disabled={loading} style={{ padding: '0.5rem 1rem' }}>
                        {loading ? 'Searching...' : 'Run Search'}
                    </button>
                    {(
                        <button
                            onClick={() => {
                                setClientCode('');
                                setStartDate(''); // Should reset to default really, but empty is fine to clear
                                setEndDate('');
                                setCheckNumber('');
                                setDonorName('');
                                setAmountMin('');
                                setAmountMax('');
                                setUiQuery({ id: 'root', combinator: 'AND', rules: [] }); // Clear advanced rules
                            }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Advanced Filters Toggle */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    {showAdvanced ? '▼ Hide Advanced Rules' : '▶ Show Advanced Rules'}
                </button>

                {showAdvanced && (
                    <div style={{ marginTop: '1rem' }}>
                        {renderGroup(uiQuery, true)}
                    </div>
                )}
            </div>

            {/* Action Buttons Row (Only if results exist) */}
            {results.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1rem' }}>
                    <button className="btn-secondary" onClick={handleExportCSV}>Export CSV</button>
                    <button className="btn-secondary" onClick={handleGenerateReport}>📄 Report</button>
                </div>
            )}

            {/* Results Table */}
            {searched && (
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Results ({results.length}{results.length >= 100 ? '+' : ''})</h3>
                    {results.length === 0 ? (
                        <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>No matches found.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-border-subtle)', color: 'var(--color-text-muted)' }}>
                                        <th style={{ padding: '0.75rem' }}>Date</th>
                                        <th style={{ padding: '0.75rem' }}>Donor</th>
                                        <th style={{ padding: '0.75rem' }}>Amount</th>
                                        <th style={{ padding: '0.75rem' }}>Method</th>
                                        <th style={{ padding: '0.75rem' }}>Client</th>
                                        <th style={{ padding: '0.75rem' }}>Batch</th>
                                        <th style={{ padding: '0.75rem' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map(r => (
                                        <tr key={r.DonationID} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                                            <td style={{ padding: '0.75rem' }}>{new Date(r.GiftDate).toLocaleDateString()}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <div style={{ fontWeight: 500 }}>{r.DonorFirstName} {r.DonorLastName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{r.DonorCity}, {r.DonorState}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--color-active)' }}>
                                                ${Number(r.GiftAmount).toFixed(2)}
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>{r.GiftMethod}</td>
                                            <td style={{ padding: '0.75rem' }}>{r.ClientCode}</td>
                                            <td style={{ padding: '0.75rem' }}>{r.BatchCode}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <Link href={`/batches/${r.BatchID}/enter`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
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
