
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { Storage } from '@google-cloud/storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const result = await query(`
            SELECT 
                f.*,
                u."Username" as "UploadedByName"
            FROM "DonorFiles" f
            LEFT JOIN "Users" u ON f."UploadedBy" = u."UserID"
            WHERE f."DonorID" = $1
            ORDER BY f."UploadedAt" DESC
        `, [id]);

        // Generate signed URLs for viewing
        const files = await Promise.all(result.rows.map(async (file) => {
            let url = null;
            if (process.env.GCS_BUCKET_NAME && process.env.GDRIVE_CREDENTIALS && file.StorageKey) {
                try {
                    const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
                    const storage = new Storage({
                        projectId: credentials.project_id,
                        credentials,
                    });
                    const [signedUrl] = await storage
                        .bucket(process.env.GCS_BUCKET_NAME)
                        .file(file.StorageKey)
                        .getSignedUrl({
                            version: 'v4',
                            action: 'read',
                            expires: Date.now() + 60 * 60 * 1000, // 1 hour
                        });
                    url = signedUrl;
                } catch (e) {
                    console.error('Error generating signed URL', e);
                }
            }
            return { ...file, url };
        }));

        return NextResponse.json(files);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    // @ts-ignore
    const userId = session.user.id || (session.user as any).UserID;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const buffer = Buffer.from(await file.arrayBuffer());
        const filename = file.name;
        const storageKey = `donors/${id}/${Date.now()}_${filename}`;

        if (process.env.GCS_BUCKET_NAME && process.env.GDRIVE_CREDENTIALS) {
            const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
            const storage = new Storage({
                projectId: credentials.project_id,
                credentials,
            });

            await storage.bucket(process.env.GCS_BUCKET_NAME).file(storageKey).save(buffer, {
                metadata: { contentType: file.type }
            });

            const fileRes = await query(`
                INSERT INTO "DonorFiles" ("DonorID", "FileName", "StorageKey", "FileSize", "MimeType", "UploadedBy")
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING "FileID", "StorageKey"
            `, [id, filename, storageKey, file.size, file.type, userId]);

            return NextResponse.json({ success: true, file: fileRes.rows[0] });
        } else {
            // Fallback for dev without GCS? Or error?
            // If local, maybe just error out or pretend
            console.warn("GCS not configured, cannot save file.");
            return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
        }

    } catch (e: any) {
        console.error('Upload error', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
