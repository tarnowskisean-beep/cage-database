
import { query } from '../lib/db';

async function verify() {
    console.log('--- Verifying Dashboard Queries ---');

    // Test Params
    const startDate = '2025-01-01';
    const endDate = '2025-01-31'; // 31 days
    const start = new Date(startDate);
    const end = new Date(endDate);

    console.log(`Range: ${startDate} to ${endDate}`);

    // 1. Test Zero-Filling Query
    console.log('\n--- Testing Zero-Filled Chart Data ---');
    try {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const interval = diffDays > 60 ? '1 month' : '1 day';
        const dateFormat = diffDays > 60 ? 'Mon YY' : 'MM/DD';

        // Mock Params: clientId, startDate, endDate, start, end
        // Let's assume clientId is NULL for simple test
        const params = [startDate, `${endDate} 23:59:59`]; // $1, $2
        const paramIndex = 1;

        // Indices matching the code I wrote in route.ts IF clientId is missing
        // params: [startDate, endDate]
        // generate_series uses $3, $4 (from paramIndex 3)
        // paramIndex currently 1
        // conditions pushes > $1, < $2. paramIndex becomes 3. 
        // generate_series needs $3, $4.

        const sql = `
            WITH date_series AS (
                SELECT generate_series(
                    $3::timestamp, 
                    $4::timestamp, 
                    '${interval}'::interval
                ) as day
            )
            SELECT 
                TO_CHAR(ds.day, '${dateFormat}') as name,
                COALESCE(SUM(d."GiftAmount"), 0) as amount,
                COUNT(d."DonationID") as count
            FROM date_series ds
            LEFT JOIN "Donations" d ON DATE_TRUNC('day', d."GiftDate") = ds.day
            AND d."GiftDate" >= $1 AND d."GiftDate" <= $2
            GROUP BY ds.day
            ORDER BY ds.day
        `;

        // Wait, my route.ts logic for LEFT JOIN conditions was:
        // LEFT JOIN ... AND d.ClientID = $1 
        // It relied on whereClause logic being outside.
        // The whereClause in route.ts is NOT APPLIED inside the LEFT JOIN ON clause for date range?
        // Actually, route.ts has:
        // LEFT JOIN "Donations" d ON DATE_TRUNC(...) = ds.day
        // ${clientId ? `AND d."ClientID" = $1` : ''}
        // It does NOT apply the date range filter inside the join explicitly beyond the ON clause matching the day?
        // Wait. DATE_TRUNC = ds.day ensures it matches the day.
        // BUT if the donation is outside the global range... well, ds.day IS the global range.
        // So it implicitly filters to the range.
        // What if there are donations on that day but for a DIFFERENT client?
        // The ClientID filter handles that.
        // What if query params had other filters (e.g. min amount)?
        // Currently only ClientID and Date Range are supported.
        // So strict equality on day + ClientID check is sufficient.

        const res = await query(sql, [...params, start.toISOString(), end.toISOString()]);
        console.log(`Rows returned: ${res.rows.length}`);
        if (res.rows.length > 0) {
            console.log('First 3 rows:', res.rows.slice(0, 3));
            console.log('Last 3 rows:', res.rows.slice(-3));
        }

        // Verify Row Count matches days (approx 31)
        if (res.rows.length >= 30) {
            console.log('✅ Zero-filling working (Row count matches range)');
        } else {
            console.log('❌ Zero-filling FAILED (Row count mismatch)');
        }

    } catch (e: any) {
        console.error('Chart Query Failed:', e.message);
    }

    // 2. Test Audit Log Filter
    console.log('\n--- Testing Audit Log Filter ---');
    try {
        const auditSql = `SELECT * FROM "AuditLogs" WHERE "CreatedAt" >= $1 AND "CreatedAt" <= $2 ORDER BY "CreatedAt" DESC LIMIT 5`;
        const auditRes = await query(auditSql, [startDate, `${endDate} 23:59:59`]);
        console.log(`Audit Logs Found: ${auditRes.rows.length}`);
        if (auditRes.rows.length > 0) {
            console.log('Sample Log Date:', auditRes.rows[0].CreatedAt);
        }
    } catch (e: any) {
        console.error('Audit Query Failed:', e.message);
    }

    process.exit(0);
}

verify();
