import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { generateJournalRows, Template } from '@/lib/journal-mapper';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { templateId, startDate, endDate, clientId, accountId } = await req.json();

        if (!templateId) return NextResponse.json({ error: 'Template required' }, { status: 400 });

        // 1. Fetch Template
        const templateRes = await query(`SELECT * FROM "export_templates" WHERE "id" = $1`, [templateId]);
        if (templateRes.rows.length === 0) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
        const template: Template = templateRes.rows[0];

        // 2. Build Query
        let sql = `
            SELECT 
                d.*,
                b."BatchCode",
                don."FirstName", don."LastName",
                c."ClientCode",
                a."AccountName", a."AccountNumber"
            FROM "Donations" d
            JOIN "Batches" b ON d."BatchID" = b."BatchID"
            LEFT JOIN "Donors" don ON d."DonorID" = don."DonorID"
            JOIN "Clients" c ON d."ClientID" = c."ClientID"
            LEFT JOIN "ClientBankAccounts" a ON b."AccountID" = a."AccountID"
            WHERE b."Status" = 'Reconciled'
        `;
        const params: any[] = [];
        let pIdx = 1;

        if (startDate) {
            sql += ` AND d."Date" >= $${pIdx++}`;
            params.push(startDate);
        }
        if (endDate) {
            sql += ` AND d."Date" <= $${pIdx++}`;
            params.push(endDate);
        }
        if (clientId && clientId !== 'All') {
            sql += ` AND d."ClientID" = $${pIdx++}`;
            params.push(clientId);
        }
        if (accountId) {
            sql += ` AND b."AccountID" = $${pIdx++}`;
            params.push(accountId);
        }

        sql += ` ORDER BY d."Date" ASC LIMIT 5000`; // Safety limit

        const dataRes = await query(sql, params);

        // 3. Generate Rows using Shared Logic
        const rows = generateJournalRows(dataRes.rows, template);

        return NextResponse.json({ rows, count: rows.length });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
