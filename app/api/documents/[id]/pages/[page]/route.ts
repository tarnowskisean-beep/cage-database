
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import jpeg from 'jpeg-js';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const maxDuration = 60; // Helper for serverless

export async function GET(request: Request, { params }: { params: Promise<{ id: string, page: string }> }) {
    try {
        const { id, page } = await params;
        const pageNum = parseInt(page);

        // Security / Auth
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Fetch Document
        const res = await query('SELECT "StorageKey" FROM "BatchDocuments" WHERE "BatchDocumentID" = $1', [id]);
        if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        const storageKey = res.rows[0].StorageKey;
        let pdfBuffer: Buffer | null = null;

        if (storageKey.startsWith('http')) {
            const fRes = await fetch(storageKey);
            const arr = await fRes.arrayBuffer();
            pdfBuffer = Buffer.from(arr);
        } else {
            // Basic GCS Simulation if needed, or error
            // For now we error if strict
            // But existing code had fallback logic? Assuming only public/drive links for this specific viewer for now.
            return NextResponse.json({ error: 'Storage type not supported for direct page view' }, { status: 501 });
        }

        if (!pdfBuffer) return NextResponse.json({ error: 'Empty file' }, { status: 500 });

        // --- PDFJS RENDER LOGIC (Pure JS) ---
        // We only want ONE page.

        const data = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjs.getDocument({ data, verbosity: 0 });
        const pdf = await loadingTask.promise;

        if (pageNum < 1 || pageNum > pdf.numPages) {
            return NextResponse.json({ error: 'Page out of bounds' }, { status: 404 });
        }

        const pdfPage = await pdf.getPage(pageNum);
        const viewport = pdfPage.getViewport({ scale: 1.5 });

        // Rasterize? 
        // PDF.js in Node usually requires a Canvas polyfill.
        // HOWEVER, we avoided Canvas in "lib/ai.ts" by extracting embedded images.
        // Here we want to RENDER the page (text + images). 
        // We MUST use a Canvas polyfill or similar if we want to "view" the page.
        // BUT Vercel has issues with 'canvas' package.
        // Alternative: Return the PDF itself? Or redirect to it with #page=N?
        // But the user UI wants an IMage tag source.

        // If we cannot use Canvas easily, we might be stuck.
        // BUT wait, `pdf-img-convert` uses puppeteer or canvas usually.
        // Given dependencies, maybe we fall back to just returning the raw PDF with content-disposition inline?
        // Browser <embed> or <iframe> can show PDF page.

        // UI says: <img src="/api/documents/..." />
        // <img /> cannot show PDF.

        // STRATEGY SHIFT:
        // Use `pdfjs-dist` to find the "Main Image" on that page and return it (like extractImagesFromPdf).
        // This is safer than rendering text.
        // Most "Scans" are just full-page images anyway.

        const ops = await pdfPage.getOperatorList();
        let bestImage: Buffer | null = null;
        let maxArea = 0;

        for (let j = 0; j < ops.fnArray.length; j++) {
            if (ops.fnArray[j] === pdfjs.OPS.paintImageXObject) {
                const imgName = ops.argsArray[j][0];
                try {
                    const img = await pdfPage.objs.get(imgName);
                    if (img && img.data) {
                        const width = img.width;
                        const height = img.height;
                        if (width * height > maxArea) {
                            maxArea = width * height;

                            // Convert to JPEG Buffer (Reusing logic from lib/ai.ts)
                            const srcData = img.data;
                            let rawBuffer = Buffer.from(srcData);
                            if (srcData.length === width * height * 3) {
                                // RGB -> RGBA manual padding
                                const newData = Buffer.alloc(width * height * 4);
                                for (let k = 0, l = 0; k < srcData.length; k += 3, l += 4) {
                                    newData[l] = srcData[k];
                                    newData[l + 1] = srcData[k + 1];
                                    newData[l + 2] = srcData[k + 2];
                                    newData[l + 3] = 0xFF;
                                }
                                rawBuffer = newData;
                            }

                            const jpegData = jpeg.encode({ data: rawBuffer, width, height }, 80);
                            bestImage = jpegData.data;
                        }
                    }
                } catch (e) {
                    // Ignore specific image access errors
                }
            }
        }

        if (bestImage) {
            return new NextResponse(bestImage as any, {
                headers: {
                    'Content-Type': 'image/jpeg',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        }

        return NextResponse.json({ error: 'No scan image found on this page' }, { status: 404 });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
