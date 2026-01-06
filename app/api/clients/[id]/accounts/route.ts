
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const res = await query(
            `SELECT "AccountID", "AccountName", "AccountType", "BankName" 
             FROM "ClientBankAccounts" 
             WHERE "ClientID" = $1 AND "IsActive" = TRUE
             ORDER BY "AccountName" ASC`,
            [id]
        );

        return NextResponse.json(res.rows);
    } catch (error) {
        console.error('Error fetching accounts:', error);
        return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }
}
