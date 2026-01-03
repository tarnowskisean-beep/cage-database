'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Types (Mirrors Search Page)
interface SearchResult {
    DonationID: number;
    GiftAmount: number;
    GiftMethod: string;
    GiftPlatform: string;
    ClientCode: string;
    ClientID: number;
    CreatedAt: string; // date
    GiftDate: string;
    ScanString?: string;
    MailCode?: string; // Derived
    // ... other needed fields
}

interface Client {
    ClientID: number;
    ClientCode: string;
    ClientName: string;
    LogoURL?: string;
}

function ReportContent() {
    const searchParams = useSearchParams();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [client, setClient] = useState<Client | null>(null);

    useEffect(() => {
        const qParam = searchParams.get('q');
        if (!qParam) {
            setLoading(false);
            return;
        }

        const fetchReportData = async () => {
            try {
                // 1. Re-run Search
                const query = JSON.parse(decodeURIComponent(qParam));
                const res = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...query, limit: 10000 })
                });
                const data = await res.json();
                const rows = Array.isArray(data) ? data : [];
                setResults(rows);

                // 2. Check for Single Client
                const uniqueClientIDs = Array.from(new Set(rows.map((r: any) => r.ClientID).filter(Boolean)));
                if (uniqueClientIDs.length === 1) {
                    // Fetch Client Details for Logo
                    const clientRes = await fetch('/api/clients'); // Ideally /api/clients/:id but we have list
                    const clients = await clientRes.json();
                    const match = clients.find((c: Client) => c.ClientID === uniqueClientIDs[0]);
                    if (match) setClient(match);
                }

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [searchParams]);

    if (loading) return <div className="p-8">Generating Report...</div>;

    // --- AGGREGATION LOGIC ---
    const totalAmount = results.reduce((sum, r) => sum + Number(r.GiftAmount || 0), 0);
    const count = results.length;

    // Platform Stats & Method Stats
    const platforms: Record<string, { count: number, sum: number }> = {};
    const methods: Record<string, { count: number, sum: number }> = {};

    results.forEach(r => {
        const p = r.GiftPlatform || 'Unknown';
        if (!platforms[p]) platforms[p] = { count: 0, sum: 0 };
        platforms[p].count++;
        platforms[p].sum += Number(r.GiftAmount || 0);

        // Aggregate ALL methods for summary stats
        const m = r.GiftMethod || 'Unknown';
        if (!methods[m]) methods[m] = { count: 0, sum: 0 };
        methods[m].count++;
        methods[m].sum += Number(r.GiftAmount || 0);
    });

    // Caging Activity Aggregation
    // Structure: MailCode -> { donors: 0, nonDonors: 0, amount: 0, methodStats: { [method]: { count, sum } } }
    type RowStats = {
        donors: number;
        nonDonors: number;
        amount: number;
        methodStats: Record<string, { count: number; sum: number }>;
    };
    const cagingActivity: Record<string, RowStats> = {};
    const uniqueMethods = new Set<string>();

    results.forEach(r => {
        const rawMailCode = r.ScanString && r.ScanString.includes('\t') ? r.ScanString.split('\t')[0] : (r.MailCode || '');
        const mailCode = rawMailCode || 'No Mail Code';
        const method = r.GiftMethod || 'Unknown';
        const amount = Number(r.GiftAmount || 0);
        const isNonDonor = method.toLowerCase() === 'zero' || method.toLowerCase() === 'non-donor';

        if (!cagingActivity[mailCode]) {
            cagingActivity[mailCode] = { donors: 0, nonDonors: 0, amount: 0, methodStats: {} };
        }

        const row = cagingActivity[mailCode];

        // Update Row Totals
        row.amount += amount;
        if (isNonDonor) {
            row.nonDonors++;
        } else {
            row.donors++;
        }

        // Update Method Stats (Skip Zero/Non-Donor for the breakdown columns if desired, strictly payment methods)
        if (!isNonDonor) {
            if (!row.methodStats[method]) row.methodStats[method] = { count: 0, sum: 0 };
            row.methodStats[method].count++;
            row.methodStats[method].sum += amount;
            uniqueMethods.add(method);
        }
    });

    // Sort methods alphabetically, but ONLY include Caging-relevant methods (Check, Cash, Credit Card)
    const CAGING_METHODS = ['Check', 'Cash', 'Credit Card'];
    const dynamicMethods = Array.from(uniqueMethods)
        .filter(m => CAGING_METHODS.includes(m))
        .sort();

    // Date Range Logic (Prioritize Query, Fallback to Data)
    let minDate = '-';
    let maxDate = '-';
    const qParam = searchParams.get('q');

    if (qParam) {
        try {
            const query = JSON.parse(decodeURIComponent(qParam));
            const findRule = (op: string) => {
                const rules = query.rules || [];
                if (Array.isArray(rules)) {
                    const rule = rules.find((r: any) => r.field === 'date' && r.operator === op);
                    return rule ? rule.value : null;
                }
                return null;
            };

            const startQuery = findRule('gte');
            const endQuery = findRule('lte');

            if (startQuery) minDate = new Date(startQuery).toLocaleDateString();
            if (endQuery) maxDate = new Date(endQuery).toLocaleDateString();
        } catch (e) {
            console.error("Error parsing query dates", e);
        }
    }

    if (minDate === '-' || maxDate === '-') {
        const dates = results.map(r => new Date(r.GiftDate).getTime());
        if (minDate === '-' && dates.length) minDate = new Date(Math.min(...dates)).toLocaleDateString();
        if (maxDate === '-' && dates.length) maxDate = new Date(Math.max(...dates)).toLocaleDateString();
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif', color: 'black', background: 'white' }}>
            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                    @page { margin: 0.5cm; }
                }
            `}</style>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '0.25rem' }}>COMPASS</h1>
                    <div style={{ fontSize: '0.9rem', letterSpacing: '2px' }}>PROFESSIONAL</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <button
                        className="no-print"
                        onClick={() => window.print()}
                        style={{
                            padding: '0.5rem 1rem',
                            background: '#0ea5e9',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        🖨️ Print / Save PDF
                    </button>
                    {client?.LogoURL ? (
                        <img src={client.LogoURL} alt="Client Logo" style={{ height: '60px', objectFit: 'contain' }} />
                    ) : (
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', fontStyle: 'italic', fontFamily: 'serif' }}>
                            {client ? client.ClientCode : 'Multi-Client Report'}
                        </div>
                    )}
                </div>
            </div>

            <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#666' }}>
                Weekly Contributions Report
            </h2>
            <div style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
                Report Date: {new Date().toLocaleDateString()} <br />
                Account: {client ? `${client.ClientName} (${client.ClientCode})` : 'All Accounts'}
            </div>

            {/* MAIN GRIDS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

                {/* LEFT: Activity Window */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', fontSize: '0.8rem' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left' }}>Activity Window:</th>
                            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>{minDate} - {maxDate}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '4px' }}>Total Record Count:</td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>{count}</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid black', padding: '4px' }}>Total Amount:</td>
                            <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>${totalAmount.toFixed(2)}</td>
                        </tr>
                        {/* Breakdown by Method */}
                        {Object.entries(methods).map(([m, stats]) => (
                            <tr key={m}>
                                <td style={{ border: '1px solid black', padding: '4px' }}>{m} Total:</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>${stats.sum.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* RIGHT: Platform Totals */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', fontSize: '0.8rem' }}>
                    <thead>
                        <tr>
                            <th colSpan={2} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Platform Totals:</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(platforms).map(([p, stats]) => (
                            <tr key={p}>
                                <td style={{ border: '1px solid black', padding: '4px' }}>Total $ of {p}:</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>${stats.sum.toFixed(2)}</td>
                            </tr>
                        ))}
                        {Object.entries(platforms).map(([p, stats]) => (
                            <tr key={p + 'count'}>
                                <td style={{ border: '1px solid black', padding: '4px' }}>Total # of {p}:</td>
                                <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>{stats.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* BOTTOM: Caging Activity (Mailcode breakdown) */}
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center', background: '#ccc', padding: '4px', border: '1px solid black' }}>
                Caging Activity (Matrix)
            </h3>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black', fontSize: '0.75rem' }}>
                    <thead>
                        <tr style={{ background: '#eee' }}>
                            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'left', minWidth: '80px' }}>Mail Code</th>
                            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Donors</th>
                            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Non-Donors</th>
                            <th style={{ border: '1px solid black', padding: '4px', textAlign: 'right' }}>Total $$</th>

                            {/* Dynamic Method Columns */}
                            {dynamicMethods.map(m => (
                                <th key={m} colSpan={2} style={{ border: '1px solid black', padding: '4px', textAlign: 'center', borderLeft: '2px solid black' }}>{m}</th>
                            ))}
                        </tr>
                        <tr style={{ background: '#eee', fontSize: '0.7rem' }}>
                            <th style={{ border: '1px solid black', padding: '4px' }}></th>
                            <th style={{ border: '1px solid black', padding: '4px' }}></th>
                            <th style={{ border: '1px solid black', padding: '4px' }}></th>
                            <th style={{ border: '1px solid black', padding: '4px' }}></th>

                            {dynamicMethods.map(m => (
                                <>
                                    <th key={`${m}-cnt`} style={{ border: '1px solid black', borderLeft: '2px solid black', padding: '4px', textAlign: 'center' }}>Donors</th>
                                    <th key={`${m}-amt`} style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>Amount</th>
                                </>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Object.keys(cagingActivity).sort().map(mailCode => {
                            const row = cagingActivity[mailCode];
                            return (
                                <tr key={mailCode}>
                                    <td style={{ border: '1px solid black', padding: '4px', fontWeight: 600 }}>{mailCode}</td>
                                    <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{row.donors}</td>
                                    <td style={{ border: '1px solid black', padding: '4px', textAlign: 'center' }}>{row.nonDonors}</td>
                                    <td style={{ border: '1px solid black', padding: '4px', textAlign: 'right', fontWeight: 600 }}>${row.amount.toFixed(2)}</td>

                                    {dynamicMethods.map(method => {
                                        const stats = row.methodStats[method] || { count: 0, sum: 0 };
                                        return (
                                            <>
                                                <td key={`${method}-cnt`} style={{ border: '1px solid black', borderLeft: '2px solid black', padding: '4px', textAlign: 'center', color: stats.count ? 'black' : '#ccc' }}>
                                                    {stats.count}
                                                </td>
                                                <td key={`${method}-amt`} style={{ border: '1px solid black', padding: '4px', textAlign: 'right', color: stats.sum ? 'black' : '#ccc' }}>
                                                    ${stats.sum.toFixed(2)}
                                                </td>
                                            </>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function ReportPage() {
    return (
        <Suspense fallback={<div>Loading Report...</div>}>
            <ReportContent />
        </Suspense>
    );
}
