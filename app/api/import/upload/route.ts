import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Papa from 'papaparse';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const sourceSystem = formData.get('source') as string;

        if (!file || !sourceSystem) {
            return NextResponse.json({ error: 'File and Source System required' }, { status: 400 });
        }

        const text = await file.text();
        const { data, errors } = Papa.parse(text, {
            header: true,
            skipEmptyLines: true
        });

        if (errors.length > 0 && data.length === 0) {
            return NextResponse.json({ error: 'Failed to parse CSV', details: errors }, { status: 400 });
        }

        // 1. Create Import Session
        const sessionRes = await query(`
            INSERT INTO "import_sessions" 
            ("filename", "source_system", "status", "created_by", "row_count")
            VALUES ($1, $2, 'Pending', $3, $4)
            RETURNING "id"
        `, [file.name, sourceSystem, (session.user as any).id, data.length]);

        const sessionId = sessionRes.rows[0].id;

        // 2. Bulk Insert Staging Data
        // We do this in batches of 1000 to be safe
        const rows = data as Record<string, any>[];
        const batchSize = 1000;

        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);

            // Generate values placeholders: ($1, $2), ($3, $4)...
            const values: any[] = [];
            const placeholders: string[] = [];

            batch.forEach((row, idx) => {
                const offset = idx * 2;
                placeholders.push(`($${offset + 1}, $${offset + 2})`);
                values.push(sessionId, JSON.stringify(row));
            });

            await query(`
                INSERT INTO "staging_revenue" ("session_id", "source_row_data")
                VALUES ${placeholders.join(', ')}
            `, values);
        }

        return NextResponse.json({
            success: true,
            sessionId,
            rowCount: data.length,
            message: `Uploaded ${data.length} records.`
        });

    } catch (error: any) {
        console.error('POST /api/import/upload error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
