
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { transaction } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // @ts-ignore
    const userId = session.user?.id;
    const periodId = params.id;
    const body = await req.json();
    const { action, date, ref } = body;

    try {
        await transaction(async (client) => {
            const periodRes = await client.query(`SELECT "Status", "TotalPeriodAmount", "ClientID" FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID" = $1`, [periodId]);
            const period = periodRes.rows[0];

            if (action === 'schedule') {
                if (period.Status !== 'Reconciled') throw new Error('Period must be Reconciled before scheduling transfer.');

                await client.query(`
                    UPDATE "ReconciliationPeriods"
                    SET "Status" = 'Scheduled', "ScheduledTransferDate" = $2
                    WHERE "ReconciliationPeriodID" = $1
                `, [periodId, date]);

            } else if (action === 'complete') {
                if (period.Status !== 'Scheduled') throw new Error('Period must be Scheduled before completing.');

                await client.query(`
                    UPDATE "ReconciliationPeriods"
                    SET "Status" = 'Transferred', "ActualTransferDate" = $2
                    WHERE "ReconciliationPeriodID" = $1
                `, [periodId, date || new Date()]);

                await client.query(`
                    INSERT INTO "ReconciliationBankTransactions"
                    ("ReconciliationPeriodID", "ClientID", "TransactionDate", "TransactionType", "AmountOut", "Description", "ReferenceNumber", "Matched", "StatementImported")
                    VALUES 
                    ($1, $2, $3, 'Transfer Out', $4, 'Transfer to Client', $5, TRUE, FALSE)
                `, [periodId, period.ClientID, date || new Date(), period.TotalPeriodAmount, ref]);
            }
        });

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
