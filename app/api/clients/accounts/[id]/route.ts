
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

// PUT /api/clients/accounts/[id] - Update
// DELETE /api/clients/accounts/[id] - Soft Delete (Deactivate)

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        const body = await req.json();
        const { accountName, bankName, accountNumber, routingNumber, accountType, isActive } = body;

        // Dynamic Update
        const fields = [];
        const values = [id];
        let idx = 2;

        if (accountName !== undefined) { fields.push(`"AccountName" = $${idx++}`); values.push(accountName); }
        if (bankName !== undefined) { fields.push(`"BankName" = $${idx++}`); values.push(bankName); }
        if (accountNumber !== undefined) { fields.push(`"AccountNumber" = $${idx++}`); values.push(accountNumber); }
        if (routingNumber !== undefined) { fields.push(`"RoutingNumber" = $${idx++}`); values.push(routingNumber); }
        if (accountType !== undefined) { fields.push(`"AccountType" = $${idx++}`); values.push(accountType); }
        if (isActive !== undefined) { fields.push(`"IsActive" = $${idx++}`); values.push(isActive); }

        if (fields.length === 0) return NextResponse.json({ success: true }); // No changes

        const res = await query(`
            UPDATE "ClientBankAccounts"
            SET ${fields.join(', ')}
            WHERE "AccountID" = $1
            RETURNING *
        `, values);

        if (res.rows.length === 0) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

        return NextResponse.json(res.rows[0]);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    try {
        // Soft Delete
        const res = await query(`
            UPDATE "ClientBankAccounts"
            SET "IsActive" = FALSE
            WHERE "AccountID" = $1
            RETURNING *
        `, [id]);

        if (res.rows.length === 0) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
