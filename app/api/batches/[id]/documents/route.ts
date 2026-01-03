import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // Fix for Next.js 15+ param handling
) {
    const { id } = await params;
    try {
        const result = await query(
            `SELECT "BatchDocumentID", "DocumentType", "FileName", "UploadedAt", "UploadedBy" 
             FROM "BatchDocuments" 
             WHERE "BatchID" = $1`,
            [id]
        );
        return NextResponse.json(result.rows);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

import { logAction } from '@/lib/audit';

// ... (GET remains similar but we do NOT select FileContent for performance)

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const type = formData.get('type') as string;

        if (!file || !type) {
            return NextResponse.json({ error: 'Missing file or type' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

        // SOC 2: Store in DB (Secure), NOT Disk
        const userId = 1; // Todo: Get from session

        await query(
            `INSERT INTO "BatchDocuments" ("BatchID", "DocumentType", "FileName", "StorageKey", "UploadedBy", "FileContent")
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, type, filename, 'db-stored', userId, buffer]
        );

        // SOC 2: Audit Log
        await logAction(userId, 'UploadDocument', id, `Uploaded ${filename} as ${type}`);

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
