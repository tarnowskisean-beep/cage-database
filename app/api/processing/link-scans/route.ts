import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Storage } from '@google-cloud/storage';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { batchId, documentId } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
        }

        // 1. Fetch Document Info
        const docResult = await query(
            'SELECT "StorageKey", "DocumentType" FROM "BatchDocuments" WHERE "BatchDocumentID" = $1',
            [documentId]
        );

        if (docResult.rows.length === 0) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const { StorageKey } = docResult.rows[0];
        let fileBuffer: Buffer | null = null;
        let mimeType = 'application/pdf'; // Assuming PDF for scans

        import { google } from 'googleapis';

        // 2. Download File
        if (StorageKey.startsWith('link:')) {
            let url = StorageKey.replace('link:', '');
            let fileBuffer: Buffer | null = null;
            let driveFileId = '';

            // INTELLIGENT G-DRIVE HANDLER
            // Convert /file/d/XXX/view  ->  /uc?export=download&id=XXX
            if (url.includes('drive.google.com') && url.includes('/file/d/')) {
                const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    driveFileId = match[1];
                }
            }

            if (driveFileId && process.env.GDRIVE_CREDENTIALS) {
                // Authenticated Google Drive Access
                try {
                    console.log('Attempting Authenticated G-Drive Download:', driveFileId);
                    const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
                    const auth = google.auth.fromJSON(credentials);
                    // Scope for read-only drive access
                    (auth as any).scopes = ['https://www.googleapis.com/auth/drive.readonly'];

                    const drive = google.drive({ version: 'v3', auth });

                    // Get file as stream/buffer
                    const response = await drive.files.get({
                        fileId: driveFileId,
                        alt: 'media'
                    }, { responseType: 'arraybuffer' });

                    fileBuffer = Buffer.from(response.data as ArrayBuffer);
                    console.log('Successfully downloaded via Drive API');

                } catch (authErr: any) {
                    console.warn('Authenticated Drive download failed, falling back to public fetch:', authErr.message);
                }
            }

            if (!fileBuffer) {
                // Fallback or Public Link
                let fetchUrl = url;
                if (driveFileId) {
                    console.log('Converting Google Drive Viewer Link to Direct Download:', driveFileId);
                    fetchUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
                }

                const res = await fetch(fetchUrl);
                if (!res.ok) throw new Error(`Failed to fetch file from link: ${res.statusText}`);
                const arrayBuffer = await res.arrayBuffer();
                fileBuffer = Buffer.from(arrayBuffer);
            }
        } else if (StorageKey.startsWith('gcs:')) {
            // ... GCS implementation if needed ...
            const bucketName = process.env.GCS_BUCKET_NAME!;
            const filePath = StorageKey.replace('gcs:', '');
            const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS!);
            const storage = new Storage({ projectId: credentials.project_id, credentials });
            const [file] = await storage.bucket(bucketName).file(filePath).download();
            fileBuffer = file;
        }

        if (!fileBuffer) {
            return NextResponse.json({ error: 'Could not retrieve file content' }, { status: 400 });
        }

        // 3. Gemini Analysis
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
            Analyze this PDF document of donation scans (checks and reply slips).
            Extract a list of all distinct donations found.
            For each donation, identify:
            1. Donor Name (fuzzy)
            2. Amount (exact)
            3. Page Number where this donation appears (1-indexed).

            Return ONLY a valid JSON array of objects:
            [
                { "name": "John Doe", "amount": 100.00, "page": 1 },
                ...
            ]
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: fileBuffer.toString('base64'),
                    mimeType: mimeType
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean markdown code blocks if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const extractedData = JSON.parse(jsonStr);

        // 4. Match and Update Database
        const batchDonations = await query(
            'SELECT "DonationID", "DonorName", "Amount" FROM "Donations" WHERE "BatchID" = $1',
            [batchId]
        );

        let matchCount = 0;

        for (const extracted of extractedData) {
            // Simple Logic: Match Amount exactly + Name loosely
            // Clean extracted amount
            const extAmount = parseFloat(extracted.amount.toString().replace(/[^0-9.]/g, ''));

            for (const donation of batchDonations.rows) {
                const dbAmount = parseFloat(donation.Amount);

                // Check Amount match
                if (Math.abs(dbAmount - extAmount) < 0.01) {
                    // Check Name match (Very basic substring check for now)
                    const dbName = (donation.DonorName || '').toLowerCase();
                    const extName = (extracted.name || '').toLowerCase();

                    // Identify if parts of name match
                    const dbParts = dbName.split(' ');
                    const isNameMatch = dbParts.some((part: string) => part.length > 2 && extName.includes(part));

                    if (isNameMatch) {
                        // UPDATE
                        await query(
                            `UPDATE "Donations" 
                              SET "ScanDocumentID" = $1, "ScanPageNumber" = $2 
                              WHERE "DonationID" = $3`,
                            [documentId, extracted.page, donation.DonationID]
                        );
                        matchCount++;
                        break; // Don't match same extraction to multiple checks (simplistic)
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            processed: extractedData.length,
            matched: matchCount,
            extracted: extractedData
        });

    } catch (e: any) {
        console.error('AI Processing Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
