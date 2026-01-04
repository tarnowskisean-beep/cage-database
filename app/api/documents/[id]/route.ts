import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logAction } from '@/lib/audit';
import { Storage } from '@google-cloud/storage';

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
            `SELECT "FileName", "DocumentType", "StorageKey", "BlobUrl" 
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

        // Link Redirect
        if (doc.StorageKey && doc.StorageKey.startsWith('link:')) {
            const url = doc.StorageKey.replace('link:', '');
            return NextResponse.redirect(url);
        }

        // GCS Signed URL Strategy
        if (doc.StorageKey && doc.StorageKey.startsWith('gcs:') && process.env.GCS_BUCKET_NAME && process.env.GDRIVE_CREDENTIALS) {
            const bucketName = process.env.GCS_BUCKET_NAME;
            const filePath = doc.StorageKey.replace('gcs:', '');

            const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
            const storage = new Storage({
                projectId: credentials.project_id,
                credentials,
            });

            const [url] = await storage
                .bucket(bucketName)
                .file(filePath)
                .getSignedUrl({
                    version: 'v4',
                    action: 'read',
                    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
                });

            return NextResponse.redirect(url);
        }

        // Legacy Vercel Blob Redirect
        if (doc.BlobUrl) {
            return NextResponse.redirect(doc.BlobUrl);
        }

        // Database Fallback (Legacy - FileContent removed)
        return NextResponse.json({ error: 'Document content not found (Legacy storage deprecated)' }, { status: 404 });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({
            error: 'Download failed',
            details: e.message,
            stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
        }, { status: 500 });
    }
}
