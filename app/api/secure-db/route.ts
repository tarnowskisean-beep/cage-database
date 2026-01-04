import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log("Starting Security Lockdown (Enabling RLS)...");

        // 1. Get all tables in the public schema
        const tablesResult = await query(
            `SELECT table_name 
             FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_type = 'BASE TABLE';`
        );

        const tables = tablesResult.rows.map((row: any) => row.table_name);
        const results = [];

        // 2. Enable RLS on each table
        for (const tableName of tables) {
            try {
                // standardized double quotes for safety
                await query(`ALTER TABLE "${tableName}" ENABLE ROW LEVEL SECURITY;`);
                results.push({ table: tableName, status: 'SECURED (RLS Enabled)' });
            } catch (err: any) {
                console.error(`Failed to secure table ${tableName}:`, err);
                results.push({ table: tableName, status: 'ERROR', error: err.message });
            }
        }

        return NextResponse.json({
            message: "Database Security Lockdown Complete",
            details: results,
            note: "RLS is now enabled. Public access is blocked. Server-side admin access remains active."
        });

    } catch (error: any) {
        console.error("Critical Security Script Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
