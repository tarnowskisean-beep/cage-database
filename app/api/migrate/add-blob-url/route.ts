import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        await query(`
            ALTER TABLE "BatchDocuments" 
            ADD COLUMN IF NOT EXISTS "BlobUrl" TEXT;
        `);
        return NextResponse.json({ message: 'Migration successful: Added BlobUrl to BatchDocuments' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
