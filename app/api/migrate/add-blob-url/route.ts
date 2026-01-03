import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await sql`
            ALTER TABLE "BatchDocuments" 
            ADD COLUMN IF NOT EXISTS "BlobUrl" TEXT;
        `;
        return NextResponse.json({ message: 'Migration successful: Added BlobUrl to BatchDocuments' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
