
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Starting schema repair...');

        const migrations = [
            `ALTER TABLE "Clients" ADD COLUMN IF NOT EXISTS "Status" text DEFAULT 'Active';`,
            `UPDATE "Clients" SET "Status" = 'Active' WHERE "Status" IS NULL;`
        ];

        const results = [];
        for (const sql of migrations) {
            try {
                await query(sql);
                results.push({ sql, status: 'Success' });
            } catch (err: any) {
                console.error(`Failed to migrate: ${sql}`, err);
                results.push({ sql, status: 'Failed', error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Schema repair complete.',
            details: results
        });

    } catch (error: any) {
        console.error('Schema fix error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
