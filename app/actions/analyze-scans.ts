'use server';

import { query } from '@/lib/db';
import OpenAI from 'openai';
import { Storage } from '@google-cloud/storage';
import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractImagesFromPdf } from '@/lib/ai';

// Allow up to 60 seconds for AI processing


export async function analyzeScanAction(batchId: string, documentId: number) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return { error: 'Unauthorized', status: 401 };
        }

        if (!process.env.OPENAI_API_KEY) {
            return { error: 'OPENAI_API_KEY is missing', status: 500 };
        }

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        // 1. Fetch Document Info
        const docResult = await query(
            'SELECT "StorageKey", "DocumentType", "BatchID" FROM "BatchDocuments" WHERE "BatchDocumentID" = $1',
            [documentId]
        );

        if (docResult.rows.length === 0) {
            return { error: 'Document not found', status: 404 };
        }

        const { StorageKey, DocumentType, BatchID: docBatchId } = docResult.rows[0];
        // Ensure we are in the right batch
        if (docBatchId.toString() !== batchId) {
            // soft mismatch warning or ignore?
        }

        let fileBuffer: Buffer | null = null;
        const originalMimeType = DocumentType === 'ReplySlipsPDF' || DocumentType === 'ChecksPDF' || !DocumentType ? 'application/pdf' : 'application/octet-stream';

        // 2. Download File
        if (StorageKey.startsWith('link:')) {
            const url = StorageKey.replace('link:', '');
            let driveFileId = '';

            const patterns = [
                /\/file\/d\/([a-zA-Z0-9_-]+)/,
                /id=([a-zA-Z0-9_-]+)/,
                /\/d\/([a-zA-Z0-9_-]+)/
            ];
            for (const p of patterns) {
                const match = url.match(p);
                if (match && match[1]) {
                    driveFileId = match[1];
                    break;
                }
            }

            if (driveFileId && process.env.GDRIVE_CREDENTIALS) {
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
                let fetchUrl = url;
                if (driveFileId) {
                    fetchUrl = 'https://drive.google.com/uc?export=download&id=' + driveFileId;
                }

                try {
                    const res = await fetch(fetchUrl);
                    if (!res.ok) {
                        return { error: `Download failed: ${res.statusText}`, status: 400 };
                    }
                    const arrayBuffer = await res.arrayBuffer();
                    fileBuffer = Buffer.from(arrayBuffer);
                } catch (fetchErr: any) {
                    return { error: `Could not download file: ${fetchErr.message}`, status: 400 };
                }
            }
        } else if (StorageKey.startsWith('gcs:')) {
            const bucketName = process.env.GCS_BUCKET_NAME!;
            const filePath = StorageKey.replace('gcs:', '');
            const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS!); // Assuming GCS uses same creds or env var structure as previously set
            const storage = new Storage({ projectId: credentials.project_id, credentials });
            const [file] = await storage.bucket(bucketName).file(filePath).download();
            fileBuffer = file;
        }

        if (!fileBuffer) {
            return { error: 'System could not retrieve file content', status: 400 };
        }

        // 3. OpenAI Analysis
        const batchRes = await query('SELECT "PaymentCategory", "DefaultGiftMethod", "CreatedBy" FROM "Batches" WHERE "BatchID" = $1', [batchId]);
        const batch = batchRes.rows[0];

        // Prepare Images for Vision API
        // We will send ALL extracted images to OpenAI so it can cross-reference Check + Reply Slip
        let imagesToSend: { base64: string, page: number }[] = [];

        if (originalMimeType === 'application/pdf') {
            const extracted = await extractImagesFromPdf(fileBuffer);
            if (extracted.length === 0) {
                // Fallback: Use simple base64 of file if it's small? No, PDF content needs extraction.
                // Actually maybe throw error.
                return { error: 'Could not extract images from PDF for AI analysis.', status: 400 };
            }
            imagesToSend = extracted.map(img => ({
                base64: img.image.toString('base64'),
                page: img.pageNumber
            }));
        } else {
            // Single image file
            imagesToSend.push({
                base64: fileBuffer.toString('base64'),
                page: 1
            });
        }

        // Limit to first 5 images to avoid token limits per doc
        const processedImages = imagesToSend.slice(0, 5);

        const prompt =
            'Analyze these images which represent a SINGLE donation transaction (e.g. Check + Reply Slip).\n' +
            'Extract a list of all distinct donations found (usually just 1, unless it is a bulk check).\n' +
            '\n' +
            'For each donation, extract:\n' +
            '1. Donor Name (best guess from Check OR Reply Slip)\n' +
            '2. Amount (exact number from Check)\n' +
            '3. Check Number (from Check)\n' +
            '4. Memo / Notes (Combine handwritten notes from Check AND Reply Slip)\n' +
            '5. Address (full donor address from Check OR Reply Slip)\n' +
            '6. Confidence Score (0.0 to 1.0)\n' +
            '\n' +
            'Return ONLY a valid JSON array of objects:\n' +
            '[\n' +
            '    { \n' +
            '        "name": "John Doe", \n' +
            '        "amount": 100.00, \n' +
            '        "check_number": "1234", \n' +
            '        "memo": "Note",\n' +
            '        "address": "123 Main St",\n' +
            '        "confidence": 0.95\n' +
            '    }\n' +
            ']';

        const contentParts: any[] = [{ type: "text", text: prompt }];
        for (const img of processedImages) {
            contentParts.push({
                type: "image_url",
                image_url: {
                    url: 'data:image/jpeg;base64,' + img.base64,
                    detail: "high"
                }
            });
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: contentParts,
                },
            ],
            response_format: { type: "json_object" },
            max_tokens: 4000,
        });

        const text = response.choices[0].message.content;
        if (!text) throw new Error("AI did not return content.");

        let extractedData: any[] = [];
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) extractedData = parsed;
            else if (parsed.donations && Array.isArray(parsed.donations)) extractedData = parsed.donations;
            else if (parsed.checks && Array.isArray(parsed.checks)) extractedData = parsed.checks;
            else {
                const val = Object.values(parsed).find(v => Array.isArray(v));
                if (val) extractedData = val as any[];
                else throw new Error("Could not find array in JSON response");
            }
        } catch (e) {
            console.error("JSON Parse Failed", text);
            throw new Error("AI returned invalid JSON structure");
        }

        // 4. Match OR Create
        const batchDonations = await query(
            'SELECT "DonationID", "DonorName", "Amount" FROM "Donations" WHERE "BatchID" = $1',
            [batchId]
        );

        let matchCount = 0;
        let createdCount = 0;

        for (const extracted of extractedData) {
            const extAmount = parseFloat((extracted.amount || 0).toString().replace(/[^0-9.]/g, ''));
            const confidence = extracted.confidence || 0.5;
            let matched = false;

            // A. TRY TO MATCH
            for (const donation of batchDonations.rows) {
                const dbAmount = parseFloat(donation.Amount);
                if (Math.abs(dbAmount - extAmount) < 0.01) {
                    const dbName = (donation.DonorName || '').toLowerCase();
                    const extName = (extracted.name || '').toLowerCase();
                    const dbParts = dbName.split(' ');
                    const isNameMatch = dbParts.some((part: string) => part.length > 2 && extName.includes(part));

                    if (isNameMatch) {
                        await query(
                            'UPDATE "Donations" ' +
                            'SET "ScanDocumentID" = $1, ' +
                            '"ScanPageNumber" = $2, ' +
                            '"CheckNumber" = COALESCE(NULLIF($3, \'\'), "CheckNumber"), ' +
                            '"Comment" = CASE ' +
                            'WHEN "Comment" IS NULL OR "Comment" = \'\' THEN $4 ' +
                            'ELSE "Comment" || \' | \' || $4 ' +
                            'END ' +
                            'WHERE "DonationID" = $5',
                            [documentId, extracted.page || 1, extracted.check_number || null, extracted.memo || null, donation.DonationID]
                        );
                        matched = true;
                        matchCount++;
                        break;
                    }
                }
            }

            // B. CREATE NEW IF NOT MATCHED
            if (!matched) {
                const status = confidence < 0.8 ? 'Flagged' : 'Pending';
                let note = extracted.memo ? '[AI Note]: ' + extracted.memo + ' ' : '';
                if (status === 'Flagged') note += ' | [AI Low Confidence: ' + Math.round(confidence * 100) + '%]';

                const insertRes = await query(
                    'INSERT INTO "Donations" ' +
                    '(' +
                    '"ClientID", "BatchID", "GiftAmount", ' +
                    '"DonorFirstName", "DonorLastName", ' +
                    '"CheckNumber", "SecondaryID", ' +
                    '"DonorAddress", ' +
                    '"Comment", ' +
                    '"ResolutionStatus", ' +
                    '"ScanDocumentID", "ScanPageNumber", ' +
                    '"GiftMethod", "GiftPlatform", "GiftDate", "BatchDate", "TransactionType", "GiftType" ' +
                    ') ' +
                    'SELECT ' +
                    'b."ClientID", $1, $2, ' +
                    '$3, \'\', ' +
                    '$4, $4, ' +
                    '$5, ' +
                    '$6, ' +
                    '$7, ' +
                    '$8, $9, ' +
                    '$10, \'Cage\', NOW(), b."Date", \'Donation\', \'Individual\' ' +
                    'FROM "Batches" b ' +
                    'WHERE b."BatchID" = $1 ' +
                    'RETURNING "DonationID"',
                    [
                        batchId, extAmount,
                        extracted.name || 'Unknown',
                        extracted.check_number || null,
                        extracted.address || null,
                        note,
                        status,
                        documentId, 1, // Default to page 1 for the main link
                        batch.DefaultGiftMethod || 'Check'
                    ]);

                if (insertRes.rows.length > 0) {
                    const newDonationId = insertRes.rows[0].DonationID;
                    createdCount++;

                    // 5. Link Images (DonationImages)
                    // Loop through ALL processed images for this doc and link them
                    for (let i = 0; i < processedImages.length; i++) {
                        const img = processedImages[i];
                        // Identify type purely by order? 
                        // Or just save them as 'ScanImage'
                        // Better: Crop/Save the blob to BatchDocuments first?
                        // Yes, saving the blob allows us to render it quickly without re-parsing PDF.

                        // 5a. Save Blob
                        const blobRes = await query(`
                                INSERT INTO "BatchDocuments" 
                                ("BatchID", "DocumentType", "FileName", "StorageKey", "UploadedBy", "FileContent")
                                VALUES ($1, 'CheckImage', $2, 'db:blob', $3, $4)
                                RETURNING "BatchDocumentID"
                            `, [
                            batchId,
                            `donation_${newDonationId}_img_${img.page}.jpg`,
                            batch.CreatedBy || 1,
                            Buffer.from(img.base64, 'base64')
                        ]);

                        const blobId = blobRes.rows[0].BatchDocumentID;

                        // 5b. Link to Donation
                        await query(`
                                INSERT INTO "DonationImages"
                                ("DonationID", "BatchDocumentID", "PageNumber", "Type", "StorageKey")
                                VALUES ($1, $2, $3, 'ScanImage', 'db:blob')
                            `, [newDonationId, blobId, img.page]);
                    }
                }
            }
        }

        return {
            success: true,
            processed: extractedData.length,
            matched: matchCount,
            created: createdCount,
            extracted: extractedData
        };

    } catch (e: any) {
        console.error('AI Processing Error:', e);
        return { error: e.message, status: 500 };
    }
}
