import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        // Add columns for AI Linking
        await query(`
            ALTER TABLE "Donations"
            ADD COLUMN IF NOT EXISTS "ScanDocumentID" INTEGER REFERENCES "BatchDocuments"("BatchDocumentID"),
            ADD COLUMN IF NOT EXISTS "ScanPageNumber" INTEGER;
        `);

        return NextResponse.json({ message: 'Migration successful: AI Linking columns added.' });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
