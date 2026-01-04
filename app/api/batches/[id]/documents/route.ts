
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAudit } from '@/lib/audit';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Fix for Next.js 15+ param handling
) {
    const { id } = await params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const result = await query(
            `SELECT "BatchDocumentID", "DocumentType", "FileName", "UploadedAt", "UploadedBy" 
             FROM "BatchDocuments" 
             WHERE "BatchID" = $1
             ORDER BY "UploadedAt" DESC`,
            [id]
        );
        return NextResponse.json(result.rows);
    } catch (e: any) {
        console.error('List Documents Error:', e);
        return NextResponse.json({ error: e.message || 'Failed to fetch documents' }, { status: 500 });
    }
}


export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = parseInt((session.user as any).id);

        // Determine if Request is JSON (Link) or FormData (File - Legacy support kept but UI removed)
        const contentType = request.headers.get('content-type') || '';

        let type = '';
        let filename = '';
        let storageKey = '';
        const buffer = null;
        let fileSizeBytes = 0;

        if (contentType.includes('application/json')) {
            // Handle Link
            const body = await request.json();
            type = body.type;
            const url = body.url;

            if (!url || !type) return NextResponse.json({ error: 'Missing url or type' }, { status: 400 });

            filename = 'External Link';
            storageKey = `link:${url}`; // Store the link prefixed
            fileSizeBytes = url.length;
        } else {
            return NextResponse.json({ error: 'Only Links are supported now.' }, { status: 400 });
        }

        // Check if Batch Exists
        const batchCheck = await query('SELECT "BatchID" FROM "Batches" WHERE "BatchID" = $1', [id]);
        if (batchCheck.rows.length === 0) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

        await query(
            `INSERT INTO "BatchDocuments" ("BatchID", "DocumentType", "FileName", "StorageKey", "UploadedBy")
             VALUES ($1, $2, $3, $4, $5)`,
            [id, type, filename, storageKey, userId]
        );

        // SOC 2: Audit Log
        await logAudit('UPLOAD_DOCUMENT', 'BATCH_DOCUMENT', id, `Added Link ${storageKey}`, 'SYSTEM');

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Upload Error:', e);
        return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
    }
}
