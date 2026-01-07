
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    const report: any = {};

    try {
        // 1. Check Connection
        try {
            await query('SELECT 1');
            report.connection = 'OK';
        } catch (e: any) {
            report.connection = `FAILED: ${e.message}`;
        }

        // 2. Check Donations Column (ResolutionStatus)
        try {
            await query('SELECT "ResolutionStatus" FROM "Donations" LIMIT 1');
            report.donations_resolution = 'OK';
        } catch (e: any) {
            report.donations_resolution = `FAILED: ${e.message}`;
        }

        // 3. Check Audit Logs
        try {
            await query('SELECT * FROM "AuditLogs" LIMIT 1');
            report.audit_logs = 'OK';
        } catch (e: any) {
            report.audit_logs = `FAILED: ${e.message}`;
        }

        // 4. Check Batches
        try {
            await query('SELECT COUNT(*) FROM "Batches"');
            report.batches = 'OK';
        } catch (e: any) {
            report.batches = `FAILED: ${e.message}`;
        }

        // 5. Test Chart Query (Complex)
        try {
            await query(`
                WITH date_series AS (
                    SELECT generate_series(
                        NOW() - INTERVAL '30 days', 
                        NOW(), 
                        '1 day'::interval
                    ) as day
                )
                SELECT * FROM date_series LIMIT 1
            `);
            report.chart_series = 'OK';
        } catch (e: any) {
            report.chart_series = `FAILED: ${e.message}`;
        }

        return NextResponse.json(report);
    } catch (e: any) {
        return NextResponse.json({ fatal_error: e.message });
    }
}
