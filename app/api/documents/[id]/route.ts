import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logAction } from '@/lib/audit';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const userId = 1; // TODO: Get from session

    try {
        // SOC 2: Access Control Check (e.g. ensure user has access to this client/batch)
        // For now, we assume authenticated users can view.

        const result = await query(
            `SELECT "FileName", "FileContent", "DocumentType" 
             FROM "BatchDocuments" 
             WHERE "BatchDocumentID" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const doc = result.rows[0];

        // SOC 2: Audit Log
        await logAction(userId, 'ViewDocument', id, `Viewed ${doc.FileName}`);

        // Return Data Stream
        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf'); // Simplified mime type handling
        if (doc.DocumentType === 'CheckImages') headers.set('Content-Type', 'image/png'); // fallback
        headers.set('Content-Disposition', `inline; filename="${doc.FileName}"`);

        return new NextResponse(doc.FileContent, {
            status: 200,
            headers
        });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Download failed' }, { status: 500 });
    }
}
