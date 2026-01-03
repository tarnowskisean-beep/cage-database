
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logAction } from '@/lib/audit';

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

import { Storage } from '@google-cloud/storage';

// Initialize Storage
// We reuse GDRIVE_CREDENTIALS because it is the same Service Account
const getStorageClient = () => {
    if (process.env.GDRIVE_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
        return new Storage({
            projectId: credentials.project_id,
            credentials,
        });
    }
    return new Storage(); // Fallback to ADC
};

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = parseInt((session.user as any).id);

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string;

        if (!file || !type) {
            return NextResponse.json({ error: 'Missing file or type' }, { status: 400 });
        }

        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const bucketName = process.env.GCS_BUCKET_NAME;

        let storageKey = 'db-stored';
        let buffer = null;

        // Check if environment is configured for GCS
        if (bucketName && process.env.GDRIVE_CREDENTIALS) {
            // Upload to Google Cloud Storage (No size limit, Secure)
            const storage = getStorageClient();
            const bucket = storage.bucket(bucketName);
            const destination = `bath-attachments/${id}/${filename}`;
            const fileObj = bucket.file(destination);

            const fileBuffer = Buffer.from(await file.arrayBuffer());
            await fileObj.save(fileBuffer);

            storageKey = `gcs:${destination}`;
        } else {
            // Fallback to Database (4.5MB Limit Applies)
            if (file.size > 4.5 * 1024 * 1024) {
                return NextResponse.json({ error: 'File too large for database. Set GCS_BUCKET_NAME and GDRIVE_CREDENTIALS for large files.' }, { status: 413 });
            }
            buffer = Buffer.from(await file.arrayBuffer());
        }

        // Check if Batch Exists
        const batchCheck = await query('SELECT "BatchID" FROM "Batches" WHERE "BatchID" = $1', [id]);
        if (batchCheck.rows.length === 0) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

        await query(
            `INSERT INTO "BatchDocuments" ("BatchID", "DocumentType", "FileName", "StorageKey", "UploadedBy", "FileContent")
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, type, filename, storageKey, userId, buffer]
        );

        // SOC 2: Audit Log
        await logAction(userId, 'UploadDocument', id, `Uploaded ${filename} as ${type} (${file.size} bytes) via ${storageKey.split(':')[0]}`);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Upload Error:', e);
        return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
    }
}
