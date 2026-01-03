
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
    // Basic authorization check (Vercel Cron sends a specific header)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // In dev, we might skip this or use a simple env var check
        // return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        console.log('[Maintenance] Starting Daily Cleanup...');
        const logEntries = [];

        // 1. Clean Expired Password Tokens
        const tokenRes = await query(`
            DELETE FROM "PasswordResetTokens" 
            WHERE "ExpiresAt" < NOW() 
            RETURNING "Token"
        `);
        logEntries.push(`Cleaned ${tokenRes.rowCount} expired password tokens.`);

        // 2. (Optional) Archive old Audit Logs (e.g. older than 2 years)
        // For now, we just count them to monitor growth
        const auditCount = await query('SELECT COUNT(*) as c FROM "AuditLogs"');
        logEntries.push(`Current Audit Log Count: ${auditCount.rows[0].c}`);

        // 3. Log Maintenance Success
        const summary = logEntries.join('; ');
        await query(`
            INSERT INTO "MaintenanceLogs" ("JobName", "Status", "Details")
            VALUES ($1, $2, $3)
        `, ['DailyCleanup', 'Success', summary]);

        return NextResponse.json({ success: true, summary });
    } catch (e: any) {
        console.error('[Maintenance Error]', e);
        await query(`
            INSERT INTO "MaintenanceLogs" ("JobName", "Status", "Details")
            VALUES ($1, $2, $3)
        `, ['DailyCleanup', 'Error', e.message]);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
