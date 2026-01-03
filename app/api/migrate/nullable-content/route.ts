import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        await query(`
            ALTER TABLE "BatchDocuments" ALTER COLUMN "FileContent" DROP NOT NULL;
        `);
        return NextResponse.json({ message: 'Migration successful: FileContent is now nullable.' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
