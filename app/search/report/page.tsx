'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// Types
interface SearchResult {
    DonationID: number;
    GiftAmount: number;
    GiftMethod: string;
    GiftPlatform: string;
    ClientCode: string;
    ClientID: number;
    CreatedAt: string;
    GiftDate: string;
    ScanString?: string;
    MailCode?: string;
    GiftPledgeAmount?: number;
    GiftFee?: number;
    // ... other fields
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
                const query = JSON.parse(decodeURIComponent(qParam));
                const res = await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...query, limit: 10000 })
                });
                const data = await res.json();
                const rows = Array.isArray(data) ? data : [];
                setResults(rows);

                const uniqueClientIDs = Array.from(new Set(rows.map((r: any) => r.ClientID).filter(Boolean)));
                if (uniqueClientIDs.length === 1) {
                    const clientRes = await fetch('/api/clients');
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

    // 1. Helpers
    const parseAmount = (val: any) => Number(val || 0);
    const isZero = (method: string) => method.toLowerCase() === 'zero' || method.toLowerCase() === 'non-donor';

    // Categorize Methods
    // Caged: Check, Cash, Credit Card
    // Non-Caged: EFT, Stock, Online
    const isCaged = (m: string) => ['Check', 'Cash', 'Credit Card'].includes(m);
    const isNonCaged = (m: string) => ['EFT', 'Stock', 'Online'].includes(m);

    // Initial Accumulators for "Activity Window"
    let totalPledged = 0;
    let totalCagedEnvelopes = 0;
    let cagedNonDonors = 0;
    let cagedDonors = 0;

    const cagedStats = {
        Check: { count: 0, sum: 0 },
        Cash: { count: 0, sum: 0 },
        'Credit Card': { count: 0, sum: 0 }
    };

    const nonCagedStats = {
        EFT: { count: 0, sum: 0 },
        Stock: { count: 0, sum: 0 },
        Online: { count: 0, sum: 0 }
    };

    let totalChargebackCount = 0;
    let totalChargebackSum = 0;

    // Platforms Accumulator
    const platformStats: Record<string, { count: number, sum: number, fees: number }> = {};
    const targetPlatforms = ['Chainbridge', 'Anedot', 'Stripe', 'Winred', 'Revv', 'Cornerstone'];
    targetPlatforms.forEach(p => platformStats[p] = { count: 0, sum: 0, fees: 0 });

    // Matrix Accumulator
    type MatrixRow = {
        donors: number;
        nonDonors: number;
        amount: number;
        check: { count: number, sum: number };
        cash: { count: number, sum: number };
        cc: { count: number, sum: number };
    };
    const matrix: Record<string, MatrixRow> = {};

    // 2. Main Loop
    results.forEach(r => {
        const method = r.GiftMethod || 'Unknown';
        const amount = parseAmount(r.GiftAmount);
        const pledge = parseAmount(r.GiftPledgeAmount);
        const fee = parseAmount(r.GiftFee);
        const platform = r.GiftPlatform || 'Unknown';
        const mailCodeRaw = r.ScanString && r.ScanString.includes('\t') ? r.ScanString.split('\t')[0] : (r.MailCode || 'No Mail Code');
        const mailCode = mailCodeRaw || 'No Mail Code';

        // Activity Window Stats
        totalPledged += pledge; // Logic check: is pledge separate? assuming yes.

        if (isCaged(method) || isZero(method)) {
            totalCagedEnvelopes++;
        }

        if (isZero(method)) {
            cagedNonDonors++;
        } else if (isCaged(method)) {
            cagedDonors++;
            // Specific Stats
            if (method === 'Check') { cagedStats.Check.count++; cagedStats.Check.sum += amount; }
            if (method === 'Cash') { cagedStats.Cash.count++; cagedStats.Cash.sum += amount; }
            if (method === 'Credit Card') { cagedStats['Credit Card'].count++; cagedStats['Credit Card'].sum += amount; }
        } else if (isNonCaged(method)) {
            // Non-Caged Stats
            if (method === 'EFT') { nonCagedStats.EFT.count++; nonCagedStats.EFT.sum += amount; }
            if (method === 'Stock') { nonCagedStats.Stock.count++; nonCagedStats.Stock.sum += amount; }
            if (method === 'Online') { nonCagedStats.Online.count++; nonCagedStats.Online.sum += amount; }
        }

        // Platform Stats (Naive mapping, check case sensitivity if needed)
        // Only track if it's one of the target platforms for now, or just map all?
        // Screenshot implies specific list.
        const pKey = targetPlatforms.find(tp => tp.toLowerCase() === platform.toLowerCase()) || 'Other';
        if (pKey !== 'Other') {
            platformStats[pKey].count++;
            platformStats[pKey].sum += amount;
            platformStats[pKey].fees += fee;
        }

        // Matrix Aggregation
        if (!matrix[mailCode]) {
            matrix[mailCode] = {
                donors: 0, nonDonors: 0, amount: 0,
                check: { count: 0, sum: 0 },
                cash: { count: 0, sum: 0 },
                cc: { count: 0, sum: 0 }
            };
        }
        const row = matrix[mailCode];
        row.amount += amount;

        if (isZero(method)) {
            row.nonDonors++;
        } else {
            row.donors++;
            if (method === 'Check') { row.check.count++; row.check.sum += amount; }
            if (method === 'Cash') { row.cash.count++; row.cash.sum += amount; }
            if (method === 'Credit Card') { row.cc.count++; row.cc.sum += amount; }
        }
    });

    const totalCagedAmount = cagedStats.Check.sum + cagedStats.Cash.sum + cagedStats['Credit Card'].sum;
    const totalNonCagedAmount = nonCagedStats.EFT.sum + nonCagedStats.Stock.sum + nonCagedStats.Online.sum;
    const grossTotal = totalCagedAmount + totalNonCagedAmount;
    const netTotal = grossTotal - totalChargebackSum; // Assuming chargebacks subtract

    // Date Range Logic
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
                table.report-table { width: 100%; border-collapse: collapse; border: 2px solid black; font-size: 0.8rem; }
                table.report-table th, table.report-table td { border: 1px solid black; padding: 4px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .font-bold { fontWeight: bold; }
                .bg-gray { background: #eee; }
            `}</style>

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontWeight: 'bold', fontSize: '1.5rem', marginBottom: '0.25rem' }}>COMPASS</h1>
                    <div style={{ fontSize: '0.9rem', letterSpacing: '2px' }}>PROFESSIONAL</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <button className="no-print" onClick={() => window.print()} style={{ padding: '0.5rem 1rem', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>
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

            <h2 style={{ textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#666' }}>Weeky Contributions Report</h2>
            <div style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
                Report Date: {new Date().toLocaleDateString()} <br />
                Account: {client ? `${client.ClientName} (${client.ClientCode})` : 'All Accounts'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* LEFT TABLE: Activity Window */}
                <table className="report-table">
                    <thead>
                        <tr>
                            <th className="text-left">Activity Window:</th>
                            <th className="text-right">{minDate} - {maxDate}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td>TY Letter Count:</td><td className="text-right">{cagedDonors}</td></tr>
                        <tr><td>Pledged Amount:</td><td className="text-right">${totalPledged.toFixed(2)}</td></tr>
                        <tr><td>Total # of Caged Envelopes:</td><td className="text-right">{totalCagedEnvelopes}</td></tr>
                        <tr><td>Total # of Caged Non-Donors:</td><td className="text-right">{cagedNonDonors}</td></tr>
                        <tr><td>Total # of Caged Donors:</td><td className="text-right">{cagedDonors}</td></tr>

                        <tr><td>Total # of Caged Donors: (Check only)</td><td className="text-right">{cagedStats.Check.count}</td></tr>
                        <tr><td>Total # of Caged Donors: (Cash only)</td><td className="text-right">{cagedStats.Cash.count}</td></tr>
                        <tr><td>Total # of Caged Donors: (CC only)</td><td className="text-right">{cagedStats['Credit Card'].count}</td></tr>

                        <tr><td>Total $ of Caged Donors: (Check only)</td><td className="text-right">${cagedStats.Check.sum.toFixed(2)}</td></tr>
                        <tr><td>Total $ of Caged Donors: (Cash only)</td><td className="text-right">${cagedStats.Cash.sum.toFixed(2)}</td></tr>
                        <tr><td>Total $ of Caged Donors: (CC only)</td><td className="text-right">${cagedStats['Credit Card'].sum.toFixed(2)}</td></tr>

                        <tr className="font-bold bg-gray">
                            <td>Caged Total Amount (cc/cash/check):</td>
                            <td className="text-right">${totalCagedAmount.toFixed(2)}</td>
                        </tr>

                        {/* Non-Caged Section */}
                        <tr><td>Total # of Non-Caged Donors: (EFT only)</td><td className="text-right">{nonCagedStats.EFT.count}</td></tr>
                        <tr><td>Total # of Non-Caged Donors: (Stock only)</td><td className="text-right">{nonCagedStats.Stock.count}</td></tr>
                        <tr><td>Total # of Non-Caged Donors: (Online only)</td><td className="text-right">{nonCagedStats.Online.count}</td></tr>

                        <tr><td>Total $ of Non-Caged Donors: (EFT only)</td><td className="text-right">${nonCagedStats.EFT.sum.toFixed(2)}</td></tr>
                        <tr><td>Total $ of Non-Caged Donors: (Stock only)</td><td className="text-right">${nonCagedStats.Stock.sum.toFixed(2)}</td></tr>
                        <tr><td>Total $ of Non-Caged Donors: (Online only)</td><td className="text-right">${nonCagedStats.Online.sum.toFixed(2)}</td></tr>

                        <tr className="font-bold bg-gray">
                            <td>Gross Total Amount:</td>
                            <td className="text-right">${grossTotal.toFixed(2)}</td>
                        </tr>

                        <tr><td>Total # of Chargebacks:</td><td className="text-right">{totalChargebackCount}</td></tr>
                        <tr><td>Total $ of Chargebacks:</td><td className="text-right">${totalChargebackSum.toFixed(2)}</td></tr>

                        <tr className="font-bold" style={{ borderTop: '2px solid black' }}>
                            <td>Net Total Amount:</td>
                            <td className="text-right">${netTotal.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* RIGHT TABLE: Platform Totals */}
                <table className="report-table">
                    <thead>
                        <tr><th colSpan={2} className="text-center">Platform Totals:</th></tr>
                    </thead>
                    <tbody>
                        {targetPlatforms.map(p => (
                            <tr key={'cnt-' + p}>
                                <td>Total # of {p}:</td>
                                <td className="text-right">{platformStats[p].count}</td>
                            </tr>
                        ))}
                        {targetPlatforms.map(p => (
                            <tr key={'sum-' + p}>
                                <td>Total $ of {p}:</td>
                                <td className="text-right">${platformStats[p].sum.toFixed(2)}</td>
                            </tr>
                        ))}
                        {/* Chargebacks filler for now */}
                        {targetPlatforms.map(p => (
                            <tr key={'cb-' + p}>
                                <td>Total # of {p} Chargebacks:</td>
                                <td className="text-right">0</td>
                            </tr>
                        ))}
                        {targetPlatforms.map(p => (
                            <tr key={'cbs-' + p}>
                                <td>Total $ of {p} Chargebacks:</td>
                                <td className="text-right">$0.00</td>
                            </tr>
                        ))}
                        {/* Fees */}
                        {targetPlatforms.map(p => (
                            <tr key={'fees-' + p}>
                                <td>Total $ of {p} Fees:</td>
                                <td className="text-right">${platformStats[p].fees.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CAGING ACTIVITY MATRIX */}
            <h3 className="text-center font-bold" style={{ border: '1px solid black', padding: '4px', background: '#ccc', fontSize: '1rem', marginBottom: '0.5rem' }}>Caging Activity Matrix</h3>
            <table className="report-table">
                <thead>
                    <tr className="bg-gray">
                        <th className="text-left">Mailcode</th>
                        <th>Donors</th>
                        <th>Non-Donors</th>
                        <th>Total $$</th>
                        <th colSpan={2} style={{ borderLeft: '2px solid black' }}>Check</th>
                        <th colSpan={2} style={{ borderLeft: '2px solid black' }}>Cash</th>
                        <th colSpan={2} style={{ borderLeft: '2px solid black' }}>CC</th>
                    </tr>
                    <tr className="bg-gray" style={{ fontSize: '0.7rem' }}>
                        <th></th><th></th><th></th><th></th>
                        <th style={{ borderLeft: '2px solid black' }}>Donors</th><th>Amount</th>
                        <th style={{ borderLeft: '2px solid black' }}>Donors</th><th>Amount</th>
                        <th style={{ borderLeft: '2px solid black' }}>Donors</th><th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(matrix).sort().map(mailCode => {
                        const row = matrix[mailCode];
                        return (
                            <tr key={mailCode}>
                                <td className="font-bold">{mailCode}</td>
                                <td className="text-center">{row.donors}</td>
                                <td className="text-center">{row.nonDonors}</td>
                                <td className="text-right font-bold">${row.amount.toFixed(2)}</td>

                                <td className="text-center" style={{ borderLeft: '2px solid black' }}>{row.check.count || '-'}</td>
                                <td className="text-right">{row.check.sum ? '$' + row.check.sum.toFixed(2) : '-'}</td>

                                <td className="text-center" style={{ borderLeft: '2px solid black' }}>{row.cash.count || '-'}</td>
                                <td className="text-right">{row.cash.sum ? '$' + row.cash.sum.toFixed(2) : '-'}</td>

                                <td className="text-center" style={{ borderLeft: '2px solid black' }}>{row.cc.count || '-'}</td>
                                <td className="text-right">{row.cc.sum ? '$' + row.cc.sum.toFixed(2) : '-'}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

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
