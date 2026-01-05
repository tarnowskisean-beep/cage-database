import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { generateJournalRows, JOURNAL_HEADERS } from '@/lib/journal-mapper';

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
        const rows = generateJournalRows(donations, template);
        const headersStr = JOURNAL_HEADERS.join(',') + '\n';

        const csvContent = headersStr + rows.map(row => {
            return JOURNAL_HEADERS.map(header => {
                const val = row[header] || '';
                if (val.includes(',') || val.includes('"')) {
                    return `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',');
        }).join('\n');

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
