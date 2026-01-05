
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS "ExportLogs" (
                "LogID" SERIAL PRIMARY KEY,
                "TemplateID" TEXT NOT NULL,
                "UserID" INT NOT NULL REFERENCES "Users"("UserID"),
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW(),
                "FilterCriteria" JSONB,
                "Status" TEXT DEFAULT 'Success'
            );
        `, []);
        return NextResponse.json({ success: true, message: "ExportLogs table created." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
