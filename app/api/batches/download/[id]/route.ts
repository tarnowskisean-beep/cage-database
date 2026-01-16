import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const batchId = params.id;

        // Get Batch and linked Import Session
        const res = await query(`
            SELECT b."ImportSessionID", s."file_content", s."filename"
            FROM "Batches" b
            JOIN "import_sessions" s ON b."ImportSessionID" = s."id"
            WHERE b."BatchID" = $1
        `, [batchId]);

        if (res.rows.length === 0) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const { file_content, filename } = res.rows[0];

        if (!file_content) {
            return NextResponse.json({ error: 'No content stored for this import' }, { status: 404 });
        }

        // Return as file download
        return new NextResponse(file_content, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        });

    } catch (error: any) {
        console.error('Download error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
