'use client';

import { useState } from 'react';
import Link from 'next/link';

// --- TYPES ---
type Operator = 'AND' | 'OR';
type RuleOperator = 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq';

interface SearchRule {
    id: string; // internal for React keys
    field: string;
    operator: RuleOperator;
    value: string;
}

interface SearchGroup {
    id: string; // internal for React keys
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

// Default initial state
const initialQuery: SearchGroup = {
    id: 'root',
    combinator: 'AND',
    rules: [
        { id: 'rule-1', field: 'donorName', operator: 'contains', value: '' }
    ]
};

// Field Definitions
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

export default function SearchPage() {
    const [query, setQuery] = useState<SearchGroup>(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // --- RECURSIVE UPDATE HELPERS ---
    // Deeply update the query tree. This identifies the target node by ID and modifies it.
    const updateGroup = (group: SearchGroup, targetId: string, transform: (g: SearchGroup) => SearchGroup): SearchGroup => {
        if (group.id === targetId) return transform(group);
        return {
            ...group,
            rules: group.rules.map(r => {
                if ('combinator' in r) return updateGroup(r as SearchGroup, targetId, transform);
                return r; // rules are leaves, handled by updateRule
            })
        };
    };

    const updateRule = (group: SearchGroup, ruleId: string, transform: (r: SearchRule) => SearchRule): SearchGroup => {
        return {
            ...group,
            rules: group.rules.map(r => {
                if ('combinator' in r) return updateRule(r as SearchGroup, ruleId, transform);
                if (r.id === ruleId) return transform(r as SearchRule);
                return r;
            })
        };
    };

    const addRuleToGroup = (group: SearchGroup, targetGroupId: string): SearchGroup => {
        if (group.id === targetGroupId) {
            return {
                ...group,
                rules: [...group.rules, { id: `rule-${Math.random()}`, field: 'donorName', operator: 'contains', value: '' }]
            };
        }
        return {
            ...group,
            rules: group.rules.map(r => {
                if ('combinator' in r) return addRuleToGroup(r as SearchGroup, targetGroupId);
                return r;
            })
        };
    };

    const addGroupToGroup = (group: SearchGroup, targetGroupId: string): SearchGroup => {
        if (group.id === targetGroupId) {
            return {
                ...group,
                rules: [...group.rules, {
                    id: `group-${Math.random()}`,
                    combinator: 'AND',
                    rules: [{ id: `rule-${Math.random()}`, field: 'donorName', operator: 'contains', value: '' }]
                }]
            };
        }
        return {
            ...group,
            rules: group.rules.map(r => {
                if ('combinator' in r) return addGroupToGroup(r as SearchGroup, targetGroupId);
                return r;
            })
        };
    };

    const removeNode = (group: SearchGroup, targetId: string): SearchGroup => {
        return {
            ...group,
            rules: group.rules
                .filter(r => r.id !== targetId)
                .map(r => {
                    if ('combinator' in r) return removeNode(r as SearchGroup, targetId);
                    return r;
                })
        };
    };

    // --- ACTIONS ---
    const handleSearch = async () => {
        setLoading(true);
        setSearched(true);
        try {
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

    // --- EXPORT ---
    const handleExportCSV = () => {
        if (!results || results.length === 0) return alert('No results to export');

        // Headers as requested
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
            // Helper to escape CSV content
            const esc = (val: string | number | null | undefined) => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            // Parse Scan String for MailCode (assuming tab sep or similar, simple logic for now)
            // If ScanString contains TAB, part 0 is Mail Code.
            let mailCode = '';
            // We need ScanString in SearchResult! (Types need update)
            // But 'r' is SearchResult. Let's use 'any' cast if fields missing or update types in next step.
            // Using 'any' for now to safely access fields that backend sends but strict type might miss until updated.
            const rec = r as any;

            if (rec.ScanString && rec.ScanString.includes('\t')) {
                mailCode = rec.ScanString.split('\t')[0];
            }

            return [
                esc(rec.DonationID),
                esc(rec.ClientID || rec.ClientCode), // Using ID if avail, else Code
                esc(rec.CreatedAt),
                esc(rec.DonationID), // CagingID = DonationID usually
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
                esc(rec.GiftAmount),
                esc(rec.GiftFee),
                esc(rec.GiftPledgeAmount),
                esc(rec.IsInactive ? 'Yes' : 'No'),
                esc(rec.GiftYear),
                esc(rec.GiftQuarter),
                esc(rec.GiftConduit),
                esc(rec.Comment),
                esc(rec.BatchID),
                esc(rec.BatchCode), // Using BatchCode as date proxy or actual needed? Headers say 'Batch Date'.
                // If backend sends BatchDate use it, else empty
                '', // CC Account
                '', // CVV
                ''  // Exp
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
        const url = `/search/report?q=${encodeURIComponent(JSON.stringify(query))}`;
        window.open(url, '_blank');
    };

    // --- RENDERERS ---
    const renderRule = (rule: SearchRule) => (
        <div key={rule.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <select
                className="input-field"
                style={{ width: '150px' }}
                value={rule.field}
                onChange={e => setQuery(prev => updateRule(prev, rule.id, r => ({ ...r, field: e.target.value })))}
            >
                {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>

            <select
                className="input-field"
                style={{ width: '150px' }}
                value={rule.operator}
                onChange={e => setQuery(prev => updateRule(prev, rule.id, r => ({ ...r, operator: e.target.value as RuleOperator })))}
            >
                {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <input
                className="input-field"
                style={{ width: '200px' }}
                value={rule.value}
                onChange={e => setQuery(prev => updateRule(prev, rule.id, r => ({ ...r, value: e.target.value })))}
                placeholder="Value..."
            />

            <button
                onClick={() => setQuery(prev => removeNode(prev, rule.id))}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1.2rem' }}
                title="Remove Rule"
            >
                ×
            </button>
        </div>
    );

    const renderGroup = (group: SearchGroup, isRoot = false) => (
        <div key={group.id} style={{
            padding: '1rem',
            border: isRoot ? 'none' : '1px solid var(--color-border)',
            background: isRoot ? 'transparent' : 'var(--color-bg-elevated)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            position: 'relative'
        }}>
            {/* Group Header */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <select
                    className="input-field"
                    style={{ width: '80px', fontWeight: 600, color: 'var(--color-primary)' }}
                    value={group.combinator}
                    onChange={e => setQuery(prev => updateGroup(prev, group.id, g => ({ ...g, combinator: e.target.value as Operator })))}
                >
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                </select>

                <div style={{ flex: 1 }}></div>

                <button
                    onClick={() => setQuery(prev => addRuleToGroup(prev, group.id))}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', cursor: 'pointer', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-main)' }}
                >
                    + Rule
                </button>
                <button
                    onClick={() => setQuery(prev => addGroupToGroup(prev, group.id))}
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', cursor: 'pointer', background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-main)' }}
                >
                    + Group
                </button>
                {!isRoot && (
                    <button
                        onClick={() => setQuery(prev => removeNode(prev, group.id))}
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1.2rem', marginLeft: '0.5rem' }}
                        title="Remove Group"
                    >
                        ×
                    </button>
                )}
            </div>

            {/* Children */}
            <div style={{ paddingLeft: isRoot ? 0 : '1rem' }}>
                {group.rules.map(item => {
                    if ('combinator' in item) return renderGroup(item as SearchGroup);
                    return renderRule(item as SearchRule);
                })}
            </div>
        </div>
    );

    return (
        <div>
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--color-text-main)' }}>Advanced Search</h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Build complex queries to find donations.</p>
                </div>
                <Link href="/" className="btn-secondary" style={{ textDecoration: 'none' }}>Back to Dashboard</Link>
            </header>

            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                {renderGroup(query, true)}
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={handleSearch} disabled={loading}>
                        {loading ? 'Searching...' : 'Run Search'}
                    </button>
                    {results.length > 0 && (
                        <>
                            <button className="btn-secondary" onClick={handleExportCSV}>
                                Export CSV
                            </button>
                            <button className="btn-secondary" onClick={handleGenerateReport}>
                                📄 Report
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Results */}
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
