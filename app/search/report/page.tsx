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
    const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

    useEffect(() => {
        const qParam = searchParams.get('q');
        if (!qParam) {
            setLoading(false);
            return;
        }

        const fetchReportData = async () => {
            try {
                const query = JSON.parse(decodeURIComponent(qParam));
                setDateRange({ start: query.startDate, end: query.endDate });

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

const parseAmount = (val: any) => Number(val || 0);
const isZero = (method: string) => method.toLowerCase() === 'zero' || method.toLowerCase() === 'non-donor';

// Categorize
const isCaged = (m: string) => ['Check', 'Cash', 'Credit Card'].includes(m);

// Accumulators
let totalPledged = 0;

// Dynamic Stats
const cagedStats: Record<string, { count: number, sum: number }> = {};
const nonCagedStats: Record<string, { count: number, sum: number }> = {};
const platformStats: Record<string, { count: number, sum: number, fees: number }> = {};

let totalCagedEnvelopes = 0;
let cagedDonors = 0;
let cagedNonDonors = 0;
let totalChargebackCount = 0;
let totalChargebackSum = 0;

type MatrixRow = {
    donors: number;
    nonDonors: number;
    amount: number;
    check: { count: number, sum: number };
    cash: { count: number, sum: number };
    cc: { count: number, sum: number };
};
const matrix: Record<string, MatrixRow> = {};

results.forEach(r => {
    const method = r.GiftMethod || 'Unknown';
    const amount = parseAmount(r.GiftAmount);
    const pledge = parseAmount(r.GiftPledgeAmount);
    const fee = parseAmount(r.GiftFee);
    const platform = r.GiftPlatform || 'Unknown';

    // MailCode extraction:
    // 1. Try ScanString split
    // 2. Try MailCode field
    // 3. Fallback
    let mailCode = 'No Mail Code';
    if (r.ScanString && r.ScanString.includes('\t')) {
        mailCode = r.ScanString.split('\t')[0];
    } else if (r.MailCode) {
        mailCode = r.MailCode;
    }

    // --- Activity Window ---
    totalPledged += pledge;

    const isRowZero = isZero(method);
    const isRowCaged = isCaged(method);

    if (isRowCaged || isRowZero) {
        totalCagedEnvelopes++;
    }

    if (isRowZero) {
        cagedNonDonors++;
    } else if (isRowCaged) {
        cagedDonors++;
        // Track Caged Breakdown
        if (!cagedStats[method]) cagedStats[method] = { count: 0, sum: 0 };
        cagedStats[method].count++;
        cagedStats[method].sum += amount;
    } else {
        // Non-Caged
        // Only track valid payment methods here, e.g. EFT, Stock, Online
        // Avoid Unknowns cluttering unless desired.
        if (!nonCagedStats[method]) nonCagedStats[method] = { count: 0, sum: 0 };
        nonCagedStats[method].count++;
        nonCagedStats[method].sum += amount;
    }

    // --- Platform Stats ---
    if (!platformStats[platform]) platformStats[platform] = { count: 0, sum: 0, fees: 0 };
    platformStats[platform].count++;
    platformStats[platform].sum += amount;
    platformStats[platform].fees += fee;

    if (method === 'Chargeback') {
        totalChargebackCount++;
        totalChargebackSum += amount;
    }

    // --- Matrix (Caging Activity) ---
    // Populate if it's Caged OR Zero (User wants Caging Activity)
    // If it's Non-Caged (Online/EFT), typically NOT in Caging Activity Matrix?
    // User requested Check/Cash/CC only cols, implying this table is for Caging items.
    if (isRowCaged || isRowZero) {
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

        if (isRowZero) {
            row.nonDonors++;
        } else {
            row.donors++;
            if (method === 'Check') { row.check.count++; row.check.sum += amount; }
            else if (method === 'Cash') { row.cash.count++; row.cash.sum += amount; }
            else if (method === 'Credit Card') { row.cc.count++; row.cc.sum += amount; }
        }
    }
});

// Totals
const totalCagedAmount = Object.values(cagedStats).reduce((acc, s) => acc + s.sum, 0);
const totalNonCagedAmount = Object.values(nonCagedStats).reduce((acc, s) => acc + s.sum, 0);
const grossTotal = totalCagedAmount + totalNonCagedAmount;
const netTotal = grossTotal - totalChargebackSum;

// Dates
let minDate = '-';
let maxDate = '-';
// ... (Date logic omitted for brevity, reusing existing fallback logic)
const dates = results.map(r => new Date(r.GiftDate).getTime());
if (dates.length) {
    minDate = new Date(Math.min(...dates)).toLocaleDateString();
    maxDate = new Date(Math.max(...dates)).toLocaleDateString();
}

// Calculate Matrix Totals
const matrixTotals = Object.values(matrix).reduce((acc, row) => ({
    donors: acc.donors + row.donors,
    nonDonors: acc.nonDonors + row.nonDonors,
    amount: acc.amount + row.amount,
    check: { count: acc.check.count + row.check.count, sum: acc.check.sum + row.check.sum },
    cash: { count: acc.cash.count + row.cash.count, sum: acc.cash.sum + row.cash.sum },
    cc: { count: acc.cc.count + row.cc.count, sum: acc.cc.sum + row.cc.sum }
}), {
    donors: 0, nonDonors: 0, amount: 0,
    check: { count: 0, sum: 0 },
    cash: { count: 0, sum: 0 },
    cc: { count: 0, sum: 0 }
});

// Helper to render currency
const fmt = (n: number) => `$${n.toFixed(2)}`;

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

        {/* Header Section (Same as before) */}
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

        {/* GRIDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1fr) minmax(300px, 1fr)', gap: '2rem', marginBottom: '2rem', alignItems: 'start' }}>

            {/* LEFT: Activity Window */}
            <table className="report-table">
                <thead>
                    <tr>
                        <th className="text-left">Activity Window:</th>
                        <th className="text-right">{minDate} - {maxDate}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>Pledged Amount:</td><td className="text-right">{fmt(totalPledged)}</td></tr>
                    <tr><td>Total # of Caged Envelopes:</td><td className="text-right">{totalCagedEnvelopes}</td></tr>
                    <tr><td>Total # of Caged Non-Donors:</td><td className="text-right">{cagedNonDonors}</td></tr>
                    <tr><td>Total # of Caged Donors:</td><td className="text-right">{cagedDonors}</td></tr>

                    {/* Dynamic Caged Stats */}
                    {Object.entries(cagedStats).map(([method, s]) => (
                        <tr key={'caged-cnt-' + method}>
                            <td>Total # of Caged Donors: ({method} only)</td>
                            <td className="text-right">{s.count}</td>
                        </tr>
                    ))}
                    {Object.entries(cagedStats).map(([method, s]) => (
                        <tr key={'caged-sum-' + method}>
                            <td>Total $ of Caged Donors: ({method} only)</td>
                            <td className="text-right">{fmt(s.sum)}</td>
                        </tr>
                    ))}

                    <tr className="font-bold bg-gray">
                        <td>Caged Total Amount:</td>
                        <td className="text-right">{fmt(totalCagedAmount)}</td>
                    </tr>

                    {/* Dynamic Non-Caged Stats */}
                    {Object.entries(nonCagedStats).map(([method, s]) => (
                        <tr key={'noncaged-cnt-' + method}>
                            <td>Total # of Non-Caged Donors: ({method} only)</td>
                            <td className="text-right">{s.count}</td>
                        </tr>
                    ))}
                    {Object.entries(nonCagedStats).map(([method, s]) => (
                        <tr key={'noncaged-sum-' + method}>
                            <td>Total $ of Non-Caged Donors: ({method} only)</td>
                            <td className="text-right">{fmt(s.sum)}</td>
                        </tr>
                    ))}

                    <tr className="font-bold bg-gray">
                        <td>Gross Total Amount:</td>
                        <td className="text-right">{fmt(grossTotal)}</td>
                    </tr>

                    <tr><td>Total # of Chargebacks:</td><td className="text-right">{totalChargebackCount}</td></tr>
                    <tr><td>Total $ of Chargebacks:</td><td className="text-right">{fmt(totalChargebackSum)}</td></tr>

                    <tr className="font-bold" style={{ borderTop: '2px solid black' }}>
                        <td>Net Total Amount:</td>
                        <td className="text-right">{fmt(netTotal)}</td>
                    </tr>
                </tbody>
            </table>

            {/* RIGHT: Platform Totals (Dynamic) */}
            <table className="report-table">
                <thead>
                    <tr><th colSpan={2} className="text-center">Platform Totals:</th></tr>
                </thead>
                <tbody>
                    {Object.entries(platformStats).sort().map(([p, s]) => (
                        <tr key={'p-cnt-' + p}>
                            <td>Total # of {p}:</td>
                            <td className="text-right">{s.count}</td>
                        </tr>
                    ))}
                    {Object.entries(platformStats).sort().map(([p, s]) => (
                        <tr key={'p-sum-' + p}>
                            <td>Total $ of {p}:</td>
                            <td className="text-right">{fmt(s.sum)}</td>
                        </tr>
                    ))}
                    {/* Only show fees if > 0 */}
                    {Object.entries(platformStats).filter(([_, s]) => s.fees > 0).sort().map(([p, s]) => (
                        <tr key={'p-fee-' + p}>
                            <td>Total $ of {p} Fees:</td>
                            <td className="text-right">{fmt(s.fees)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* CAGING MATRIX */}
        <h3 className="text-center font-bold" style={{ border: '1px solid black', padding: '4px', background: '#ccc', fontSize: '1rem', marginBottom: '0.5rem' }}>Caging Activity Matrix</h3>
        <div style={{ overflowX: 'auto' }}>
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
                                <td className="text-right font-bold">{fmt(row.amount)}</td>

                                <td className="text-center" style={{ borderLeft: '2px solid black' }}>{row.check.count || '-'}</td>
                                <td className="text-right">{row.check.sum ? fmt(row.check.sum) : '-'}</td>

                                <td className="text-center" style={{ borderLeft: '2px solid black' }}>{row.cash.count || '-'}</td>
                                <td className="text-right">{row.cash.sum ? fmt(row.cash.sum) : '-'}</td>

                                <td className="text-center" style={{ borderLeft: '2px solid black' }}>{row.cc.count || '-'}</td>
                                <td className="text-right">{row.cc.sum ? fmt(row.cc.sum) : '-'}</td>
                            </tr>
                        );
                    })}
                    {/* Totals Row */}
                    <tr className="bg-gray font-bold" style={{ borderTop: '2px solid black' }}>
                        <td className="text-right">TOTALS:</td>
                        <td className="text-center">{matrixTotals.donors}</td>
                        <td className="text-center">{matrixTotals.nonDonors}</td>
                        <td className="text-right">{fmt(matrixTotals.amount)}</td>

                        <td className="text-center" style={{ borderLeft: '2px solid black' }}>{matrixTotals.check.count}</td>
                        <td className="text-right">{fmt(matrixTotals.check.sum)}</td>

                        <td className="text-center" style={{ borderLeft: '2px solid black' }}>{matrixTotals.cash.count}</td>
                        <td className="text-right">{fmt(matrixTotals.cash.sum)}</td>

                        <td className="text-center" style={{ borderLeft: '2px solid black' }}>{matrixTotals.cc.count}</td>
                        <td className="text-right">{fmt(matrixTotals.cc.sum)}</td>
                    </tr>
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
