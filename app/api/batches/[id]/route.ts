import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const result = await query(`
            SELECT b.*, c."ClientCode", a."AccountName"
            FROM "Batches" b
            LEFT JOIN "Clients" c ON b."ClientID" = c."ClientID"
            LEFT JOIN "ClientBankAccounts" a ON b."AccountID" = a."AccountID"
            WHERE b."BatchID" = $1
        `, [id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status } = body;

        // Construct update query dynamically (simplistic for now)
        if (status) {
            // Validation Logic for CLOSING
            if (status === 'Closed') {
                const batchRes = await query(`
                    SELECT "PaymentCategory" FROM "Batches" WHERE "BatchID" = $1
                `, [id]);

                const docsRes = await query(`
                    SELECT "DocumentType" FROM "BatchDocuments" WHERE "BatchID" = $1
                `, [id]);

                if (batchRes.rows.length === 0) {
                    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
                }

                const paymentCategory = batchRes.rows[0].PaymentCategory;
                const uploadedTypes = new Set(docsRes.rows.map(d => d.DocumentType));

                const missing = [];

                if (['Checks', 'Mixed'].includes(paymentCategory)) {
                    if (!uploadedTypes.has('ReplySlipsPDF')) missing.push('Reply Slips');
                    if (!uploadedTypes.has('ChecksPDF')) missing.push('Check Images');
                }
                else if (paymentCategory === 'Credit Card') {
                    if (!uploadedTypes.has('ReplySlipsPDF')) missing.push('Reply Slips');
                }
                else if (paymentCategory === 'Cash') {
                    if (!uploadedTypes.has('ReplySlipsPDF')) missing.push('Reply Slips');
                    if (!uploadedTypes.has('DepositSlip')) missing.push('Deposit Slip');
                }

                if (missing.length > 0) {
                    return NextResponse.json(
                        { error: `Cannot close batch. Missing required documents: ${missing.join(', ')}` },
                        { status: 400 }
                    );
                }
            }

            const result = await query(`
                UPDATE "Batches" 
                SET "Status" = $1 
                WHERE "BatchID" = $2
                RETURNING *
            `, [status, id]);
            return NextResponse.json(result.rows[0]);
        }

        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
