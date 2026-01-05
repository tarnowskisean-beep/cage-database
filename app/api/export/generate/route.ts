import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { templateId, batchIds } = await req.json();

        if (!templateId || !batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        // 1. Fetch Template
        const templateRes = await query(`SELECT * FROM "export_templates" WHERE "id" = $1`, [templateId]);
        if (templateRes.rows.length === 0) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        const template = templateRes.rows[0];
        const rowsDef = template.mappings; // Array of RowDefinitions

        // 2. Fetch Data (Joins needed for full context)
        const sql = `
            SELECT 
                d.*,
                b."BatchCode",
                don."FirstName", don."LastName",
                c."ClientCode"
            FROM "Donations" d
            JOIN "Batches" b ON d."BatchID" = b."BatchID"
            LEFT JOIN "Donors" don ON d."DonorID" = don."DonorID"
            JOIN "Clients" c ON d."ClientID" = c."ClientID"
            WHERE d."BatchID" = ANY($1)
            ORDER BY d."Date" ASC
        `;
        const dataRes = await query(sql, [batchIds]);
        const donations = dataRes.rows;

        // 3. Generate CSV
        const HEADERS = [
            'JournalNo', 'JournalDate', 'AccountName', 'Debits', 'Credits',
            'Description', 'Name', 'Currency', 'Location', 'Class'
        ];

        let csvContent = HEADERS.join(',') + '\n';

        for (const donation of donations) {
            // Helper for interpolation
            const replacer = (val: string) => {
                if (!val) return '';
                return val
                    .replace(/{BatchCode}/g, donation.BatchCode || '')
                    .replace(/{Date}/g, new Date(donation.Date).toLocaleDateString())
                    .replace(/{Amount}/g, donation.GiftAmount || '0')
                    .replace(/{DonorName}/g, `${donation.FirstName || ''} ${donation.LastName || ''}`.trim())
                    .replace(/{PaymentMethod}/g, donation.GiftMethod || '')
                    .replace(/{CheckNumber}/g, donation.CheckNumber || '')
                    .replace(/{Platform}/g, donation.GiftPlatform || '')
                    .replace(/{TransactionType}/g, donation.TransactionType || '')
                    .replace(/{Fund}/g, '') // Placeholder for future
                    .replace(/{Campaign}/g, ''); // Placeholder for future
            };

            for (const rowDef of rowsDef) {
                const csvRow = HEADERS.map(header => {
                    const rawValue = rowDef[header] || '';
                    const finalValue = replacer(rawValue);
                    // Escape commas/quotes
                    if (finalValue.includes(',') || finalValue.includes('"')) {
                        return `"${finalValue.replace(/"/g, '""')}"`;
                    }
                    return finalValue;
                });
                csvContent += csvRow.join(',') + '\n';
            }
        }

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="export_${template.name.replace(/\s+/g, '_')}.csv"`
            }
        });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
