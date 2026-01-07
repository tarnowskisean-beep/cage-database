
import { query } from '@/lib/db';

async function debugStats() {
    try {
        console.log('--- STARTING STATS DEBUG ---');

        const clientId = null;
        const startDate = null;
        const endDate = null;

        const defaultStart = new Date();
        defaultStart.setMonth(defaultStart.getMonth() - 6);
        const start = startDate ? new Date(startDate) : defaultStart;
        const end = endDate ? new Date(endDate) : new Date();

        // Query 1: Revenue
        console.log('1. Testing Revenue...');
        await query(`SELECT SUM(d."GiftAmount") as total FROM "Donations" d`);

        // Query 2: By Client
        console.log('2. Testing By Client...');
        await query(`
             SELECT c."ClientName", SUM(d."GiftAmount") as total 
             FROM "Donations" d 
             JOIN "Clients" c ON d."ClientID" = c."ClientID" 
             GROUP BY c."ClientName"
        `);

        // Query 7: Unique Donors
        console.log('7. Testing Unique Donors...');
        await query(`SELECT COUNT(DISTINCT d."DonorID") as count FROM "Donations" d`);

        // Query 8: Chart Generates Series
        console.log('8. Testing Chart Generation...');
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const interval = diffDays > 60 ? '1 month' : '1 day';
        const dateFormat = diffDays > 60 ? 'Mon YY' : 'MM/DD';

        await query(`
            WITH date_series AS (
                SELECT generate_series(
                    $1::timestamp, 
                    $2::timestamp, 
                    '${interval}'::interval
                ) as day
            )
            SELECT 
                TO_CHAR(ds.day, '${dateFormat}') as name,
                COALESCE(SUM(d."GiftAmount"), 0) as amount,
                COUNT(d."DonationID") as count
            FROM date_series ds
            LEFT JOIN "Donations" d ON DATE_TRUNC('${diffDays > 60 ? 'month' : 'day'}', d."GiftDate") = ds.day
            GROUP BY ds.day
            ORDER BY ds.day
        `, [start.toISOString(), end.toISOString()]);

        // Query 10: Pending Resolutions (The new one)
        console.log('10. Testing Resolution Status...');
        await query(`SELECT COUNT(*) as count FROM "Donations" WHERE "ResolutionStatus" = 'Pending'`);

        console.log('--- ALL CHECKS PASSED ---');
        process.exit(0);

    } catch (e: any) {
        console.error('!!! DEBUG FAILED !!!');
        console.error(e);
        process.exit(1);
    }
}

debugStats();
