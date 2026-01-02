import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const text = await file.text();
        const lines = text.split('\n');

        // Simple CSV Parser (assuming headers on row 1)
        // Expected Headers map to DB columns roughly
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

        let successCount = 0;
        let skipCount = 0;

        // Process in chunks or one by one. For MVP, one by one is fine but slow. 
        // Better: Construct bulk insert.
        // For simplicity and error handling in MVP, loop.

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Handle quoted commas? For MVP assuming simple CSV or pipe
            // But user said "Finder File", likely standard CSV.
            // Let's do a basic split for now.
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));

            // Map columns based on headers. 
            // We need to be flexible or enforce a template.
            // Let's assume standard template for now or try to match.

            const getVal = (key: string) => {
                const idx = headers.findIndex(h => h.toLowerCase().includes(key.toLowerCase()));
                return idx !== -1 ? values[idx] : null;
            };

            const cagingId = getVal('caging') || getVal('barcode') || getVal('id');
            if (!cagingId) { skipCount++; continue; }

            const mailerId = getVal('mailer');
            const mailCode = getVal('code');
            const firstName = getVal('first');
            const lastName = getVal('last');
            const address = getVal('address');
            const city = getVal('city');
            const state = getVal('state');
            const zip = getVal('zip');

            try {
                await query(`
                    INSERT INTO "Prospects" 
                    ("ClientID", "CagingID", "MailerID", "MailCode", "FirstName", "LastName", "Address", "City", "State", "Zip", "ImportedAt")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                    ON CONFLICT ("ClientID", "CagingID") 
                    DO UPDATE SET 
                        "FirstName" = EXCLUDED."FirstName",
                        "LastName" = EXCLUDED."LastName",
                        "Address" = EXCLUDED."Address",
                        "ImportedAt" = NOW()
                `, [id, cagingId, mailerId, mailCode, firstName, lastName, address, city, state, zip]);
                successCount++;
            } catch (e) {
                console.error('Row error:', e);
                skipCount++;
            }
        }

        return NextResponse.json({ success: true, count: successCount, skipped: skipCount });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || 'Import failed' }, { status: 500 });
    }
}
