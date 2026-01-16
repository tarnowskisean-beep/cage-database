
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { convertPdfToImages } from '@/lib/ai';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import fs from 'fs'; // For temp reading if needed, but we'll try buffer first

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

        // Fetch File Content (Reuse logic from link-scans or similar)
        // For speed, let's assume it's a public link for now or handle simple fetch
        // In prod, this needs the full GCS/Drive logic
        let pdfBuffer: Buffer | null = null;

        if (storageKey.startsWith('http')) {
            const fRes = await fetch(storageKey);
            const arr = await fRes.arrayBuffer();
            pdfBuffer = Buffer.from(arr);
        } else {
            // Hande GCS... for now error if not link
            return NextResponse.json({ error: 'Only HTTP links supported for page rendering currently' }, { status: 501 });
        }

        if (!pdfBuffer) return NextResponse.json({ error: 'Empty file' }, { status: 500 });

        // Convert Specific Page
        // pdf-img-convert converts ALL by default or range. 
        // We really should cache this or be careful. 
        // For a demo/MVP, converting the specific page array is okay (it might process whole doc though).
        // Optimization: slice PDF first? 
        // Let's just use convert(pdf, { page_numbers: [pageNum] })

        const { convert } = await import('pdf-img-convert');
        const images = await convert(pdfBuffer, {
            page_numbers: [pageNum],
            scale: 1.5
        });

        if (images.length === 0) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

        const imgBuffer = Buffer.from(images[0]);

        return new NextResponse(imgBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'public, max-age=3600'
            }
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
