
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { extractImagesFromPdf, extractDonationData } from '@/lib/ai';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { google } from 'googleapis';
import { Storage } from '@google-cloud/storage';

export const maxDuration = 60; // Extend timeout for AI processing

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: batchId } = await params;
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Fetch Batch Context (for AI Hinting)
        const batchRes = await query(
            'SELECT "PaymentCategory", "DefaultGiftMethod", "CreatedBy" FROM "Batches" WHERE "BatchID" = $1',
            [batchId]
        );
        if (batchRes.rows.length === 0) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

        const batch = batchRes.rows[0];
        // Map Batch Meta to AI Context
        let aiContext = 'Check';
        if (batch.PaymentCategory === 'Cash') aiContext = 'Cash';
        if (batch.PaymentCategory === 'CC') aiContext = 'Credit';
        if (batch.PaymentCategory === 'Zeros') aiContext = 'Zero';

        // 2. Fetch Documents for Batch
        const docsRes = await query(
            'SELECT "BatchDocumentID", "StorageKey" FROM "BatchDocuments" WHERE "BatchID" = $1',
            [batchId]
        );

        if (docsRes.rows.length === 0) {
            return NextResponse.json({ message: 'No documents found in batch.' });
        }

        let totalProcessed = 0;
        let totalCreated = 0;

        for (const doc of docsRes.rows) {
            // DOWNLOAD LOGIC (Reused/Simplified)
            let pdfBuffer: Buffer | null = null;
            const url = doc.StorageKey.replace('link:', '').replace('gcs:', '');

            if (doc.StorageKey.startsWith('gcs:') && process.env.GCS_BUCKET_NAME && process.env.GDRIVE_CREDENTIALS) {
                const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
                const storage = new Storage({ projectId: credentials.project_id, credentials });
                const [file] = await storage.bucket(process.env.GCS_BUCKET_NAME).file(url).download();
                pdfBuffer = file;
            } else if (doc.StorageKey.startsWith('link:')) {
                // Link handling (Drive or Public)
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
                        const res = await drive.files.get({ fileId: driveFileId, alt: 'media' }, { responseType: 'arraybuffer' });
                        pdfBuffer = Buffer.from(res.data as ArrayBuffer);
                    } catch (e) {
                        console.error('Drive fetch failed', e);
                    }
                }

                // Fallback public fetch
                if (!pdfBuffer) {
                    let fetchUrl = url;
                    if (driveFileId) fetchUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;

                    const res = await fetch(fetchUrl);
                    if (res.ok) pdfBuffer = Buffer.from(await res.arrayBuffer());
                }
            }

            if (!pdfBuffer) {
                console.error(`Failed to download doc ${doc.BatchDocumentID}`);
                continue;
            }

            // AI PROCESSING
            try {
                // 1. Extract Images
                const images = await extractImagesFromPdf(pdfBuffer);

                // 2. Process Each Image
                for (const imgData of images) {
                    // PASS CONTEXT TO AI
                    const aiResult = await extractDonationData(imgData.image, imgData.pageNumber, aiContext);

                    if (aiResult && !aiResult.isIrrelevant) {
                        // 3. CREATE DRAFT DONATION
                        // Logic: Always create a new row with 'Pending' status.

                        // Parse values
                        const amount = parseFloat(aiResult.amount) || 0;
                        const isKillList = aiResult.isKillList === true;

                        // Construct Comment with Meta
                        let finalComment = aiResult.notes ? `[AI Note]: ${aiResult.notes}` : '';
                        if (isKillList) finalComment += ' | [AI Alert]: User requested removal.';

                        // Insert
                        const insertRes = await query(`
                            INSERT INTO "Donations" 
                            (
                                "ClientID", "BatchID", "GiftAmount", 
                                "DonorFirstName", "DonorLastName", 
                                "CheckNumber", "SecondaryID", 
                                "RoutingNumber", "AccountNumber",
                                "DonorAddress", "DonorEmail", 
                                "CampaignID", "Comment",
                                "IsInactive", 
                                "ResolutionStatus",
                                "ScanDocumentID", "ScanPageNumber",
                                "GiftMethod", "GiftPlatform", "GiftDate", "BatchDate", "TransactionType", "GiftType"
                            )
                            SELECT 
                                b."ClientID", $1, $2,
                                $3, '', -- Split name logic later? For now, dump in First
                                $4, $4, -- CheckNum/Secondary
                                $5, $6, -- Routing/Account
                                $7, $8, 
                                $9, $10,
                                $11, -- IsInactive
                                'Pending', -- ResolutionStatus
                                $12, $13,
                                $14, 'Cage', NOW(), b."Date", 'Donation', 'Individual'
                            FROM "Batches" b
                            WHERE b."BatchID" = $1
                            RETURNING "DonationID"
                        `, [
                            batchId, amount,
                            aiResult.donorName || 'Unknown',
                            aiResult.checkNumber || null,
                            aiResult.routingNumber || null, aiResult.accountNumber || null,
                            aiResult.address || null, aiResult.email || null,
                            aiResult.campaign || null, finalComment,
                            isKillList,
                            doc.BatchDocumentID, aiResult.pageNumber,
                            batch.DefaultGiftMethod || 'Check'
                        ]);

                        if (insertRes.rows.length > 0) {
                            const newDonationId = insertRes.rows[0].DonationID;


                            // 3a. Save Cropped Image (Front)
                            // We need to persist the buffer for ICL generation
                            const cropDocRes = await query(`
                                INSERT INTO "BatchDocuments" 
                                ("BatchID", "DocumentType", "FileName", "StorageKey", "UploadedBy", "FileContent")
                                VALUES ($1, 'CheckFront', $2, 'db:blob', $3, $4)
                                RETURNING "BatchDocumentID"
                            `, [
                                batchId,
                                `donation_${newDonationId}_front.jpg`,
                                batch.CreatedBy || 1, // Fallback to ID 1 if system
                                imgData.image
                            ]);

                            const croppedDocId = cropDocRes.rows[0].BatchDocumentID;

                            // 3b. Link Image
                            await query(`
                                INSERT INTO "DonationImages" 
                                ("DonationID", "BatchDocumentID", "PageNumber", "Type", "StorageKey")
                                VALUES ($1, $2, 1, 'CheckFront', 'db:blob')
                            `, [
                                newDonationId,
                                croppedDocId
                            ]);

                            // Also link the original PDF page for reference (optional, or as 'Source')
                            await query(`
                                INSERT INTO "DonationImages" 
                                ("DonationID", "BatchDocumentID", "PageNumber", "Type", "StorageKey")
                                VALUES ($1, $2, $3, 'SourcePDF', $4)
                            `, [
                                newDonationId,
                                doc.BatchDocumentID,
                                aiResult.pageNumber,
                                doc.StorageKey
                            ]);

                            totalCreated++;
                        }
                    }
                }
                totalProcessed++;

            } catch (e) {
                console.error('Processing failed for doc', e);
            }
        }

        return NextResponse.json({ success: true, processed: totalProcessed, created: totalCreated });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
