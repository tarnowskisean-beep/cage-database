import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Storage } from '@google-cloud/storage';
import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
        const mimeType = 'application/pdf'; // Assuming PDF for scans



        // 2. Download File
        // 2. Download File
        if (StorageKey.startsWith('link:')) {
            const url = StorageKey.replace('link:', '');
            let driveFileId = '';

            // ROBUST DRIVE ID EXTRACTION
            const patterns = [
                /\/file\/d\/([a-zA-Z0-9_-]+)/, // /file/d/ID
                /id=([a-zA-Z0-9_-]+)/,          // ?id=ID
                /\/d\/([a-zA-Z0-9_-]+)/         // /d/ID
            ];
            for (const p of patterns) {
                const match = url.match(p);
                if (match && match[1]) {
                    driveFileId = match[1];
                    break;
                }
            }

            if (driveFileId && process.env.GDRIVE_CREDENTIALS) {
                // Authenticated Google Drive Access
                try {
                    const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
                    const auth = google.auth.fromJSON(credentials);
                    (auth as any).scopes = ['https://www.googleapis.com/auth/drive.readonly'];
                    const drive = google.drive({ version: 'v3', auth: auth as any });

                    const response = await drive.files.get({
                        fileId: driveFileId,
                        alt: 'media'
                    }, { responseType: 'arraybuffer' });

                    fileBuffer = Buffer.from(response.data as ArrayBuffer);

                } catch (authErr: any) {
                    console.warn('Authenticated Drive download failed:', authErr.message);
                }
            }

            if (!fileBuffer) {
                // Fallback or Public Link
                let fetchUrl = url;
                if (driveFileId) {
                    // Convert to reliable export link
                    fetchUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
                }

                try {
                    const res = await fetch(fetchUrl);
                    if (!res.ok) {
                        // More specific error
                        if (res.status === 403 || res.status === 401) {
                            throw new Error(`Access Denied (Status ${res.status}). Please ensure the link is 'Anyone with the link' OR shared with the system email.`);
                        }
                        if (res.status === 404) {
                            throw new Error(`File not found (Status 404). Check the link.`);
                        }
                        throw new Error(`Download failed: ${res.statusText}`);
                    }
                    const arrayBuffer = await res.arrayBuffer();
                    fileBuffer = Buffer.from(arrayBuffer);
                } catch (fetchErr: any) {
                    console.error("Public Fetch Error:", fetchErr);
                    // If we have a drive ID but failed, report likely cause
                    if (driveFileId) {
                        return NextResponse.json({ error: `Could not access Google Drive file. Ensure link is public or shared. Error: ${fetchErr.message}` }, { status: 400 });
                    }
                    return NextResponse.json({ error: `Could not download file. Error: ${fetchErr.message}` }, { status: 400 });
                }
            }
        } else if (StorageKey.startsWith('gcs:')) {
            const bucketName = process.env.GCS_BUCKET_NAME!;
            const filePath = StorageKey.replace('gcs:', '');
            const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS!);
            const storage = new Storage({ projectId: credentials.project_id, credentials });
            const [file] = await storage.bucket(bucketName).file(filePath).download();
            fileBuffer = file;
        }

        if (!fileBuffer) {
            return NextResponse.json({ error: 'System could not retrieve file content (Unknown Storage Type or Empty)' }, { status: 400 });
        }

        // 3. Gemini Analysis
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Retrieve Batch Context
        const batchRes = await query('SELECT "PaymentCategory", "DefaultGiftMethod" FROM "Batches" WHERE "BatchID" = $1', [batchId]);
        const batch = batchRes.rows[0];

        const prompt = `
            Analyze this PDF document of donation scans (checks, reply slips, or correspondence/letters).
            Extract a list of all distinct donations/checks found.
            
            For each donation, extract:
            1. Donor Name (best guess)
            2. Amount (exact number)
            3. Page Number (1-indexed)
            4. Check Number (if visible)
            5. Memo / Notes (handwritten)
            6. Address (full donor address if visible)
            7. Confidence Score (0.0 to 1.0) - How confident are you in the Amount and Name?

            Return ONLY a valid JSON array of objects:
            [
                { 
                    "name": "John Doe", 
                    "amount": 100.00, 
                    "page": 1, 
                    "check_number": "1234", 
                    "memo": "In memory of X",
                    "address": "123 Main St",
                    "confidence": 0.95
                }
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
        let extractedData;
        try {
            extractedData = JSON.parse(jsonStr);
        } catch (e) {
            console.error("JSON Parse Failed", text);
            throw new Error("AI returned invalid JSON");
        }

        // 4. Match OR Create
        const batchDonations = await query(
            'SELECT "DonationID", "DonorName", "Amount" FROM "Donations" WHERE "BatchID" = $1',
            [batchId]
        );

        let matchCount = 0;
        let createdCount = 0;

        for (const extracted of extractedData) {
            const extAmount = parseFloat(extracted.amount.toString().replace(/[^0-9.]/g, ''));
            const confidence = extracted.confidence || 0.5;
            let matched = false;

            // A. TRY TO MATCH
            for (const donation of batchDonations.rows) {
                const dbAmount = parseFloat(donation.Amount);
                if (Math.abs(dbAmount - extAmount) < 0.01) {
                    const dbName = (donation.DonorName || '').toLowerCase();
                    const extName = (extracted.name || '').toLowerCase();
                    // Basic name match
                    const dbParts = dbName.split(' ');
                    const isNameMatch = dbParts.some((part: string) => part.length > 2 && extName.includes(part));

                    if (isNameMatch) {
                        // UPDATE Existing
                        await query(
                            `UPDATE "Donations" 
                              SET "ScanDocumentID" = $1, 
                                  "ScanPageNumber" = $2,
                                  "SecondaryID" = COALESCE(NULLIF($3, ''), "SecondaryID"),
                                  "CheckNumber" = COALESCE(NULLIF($3, ''), "CheckNumber"),
                                  "Comment" = CASE 
                                      WHEN "Comment" IS NULL OR "Comment" = '' THEN $4 
                                      ELSE "Comment" || ' | ' || $4 
                                  END
                              WHERE "DonationID" = $5`,
                            [documentId, extracted.page, extracted.check_number || null, extracted.memo || null, donation.DonationID]
                        );
                        matched = true;
                        matchCount++;
                        break;
                    }
                }
            }

            // B. CREATE NEW IF NOT MATCHED
            if (!matched) {
                // Resolution Status: 'Pending' normally, 'Flagged' if low confidence
                const status = confidence < 0.8 ? 'Flagged' : 'Pending';

                // Construct Note
                let note = extracted.memo ? `[AI Note]: ${extracted.memo}` : '';
                if (status === 'Flagged') note += ` | [AI Low Confidence: ${Math.round(confidence * 100)}%]`;

                await query(`
                    INSERT INTO "Donations" 
                    (
                        "ClientID", "BatchID", "GiftAmount", 
                        "DonorFirstName", "DonorLastName", 
                        "CheckNumber", "SecondaryID",
                        "DonorAddress", 
                        "Comment",
                        "ResolutionStatus",
                        "ScanDocumentID", "ScanPageNumber",
                        "GiftMethod", "GiftPlatform", "GiftDate", "BatchDate", "TransactionType", "GiftType"
                    )
                    SELECT 
                        b."ClientID", $1, $2,
                        $3, '', -- Name logic
                        $4, $4,
                        $5, 
                        $6,
                        $7, -- Status
                        $8, $9,
                        $10, 'Cage', NOW(), b."Date", 'Donation', 'Individual'
                    FROM "Batches" b
                    WHERE b."BatchID" = $1
                `, [
                    batchId, extAmount,
                    extracted.name || 'Unknown',
                    extracted.check_number || null,
                    extracted.address || null,
                    note,
                    status,
                    documentId, extracted.page,
                    batch.DefaultGiftMethod || 'Check'
                ]);
                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            processed: extractedData.length,
            matched: matchCount,
            created: createdCount,
            extracted: extractedData
        });

    } catch (e: any) {
        console.error('AI Processing Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
