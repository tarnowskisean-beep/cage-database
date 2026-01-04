
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

    try {
        const result = await transaction(async (client) => {
            const detailsRes = await client.query(`SELECT "AmountDonorNet" FROM "ReconciliationBatchDetails" WHERE "ReconciliationPeriodID" = $1`, [periodId]);
            const expectedNet = parseFloat(detailsRes.rows[0]?.AmountDonorNet || 0);

            const bankRes = await client.query(`
                SELECT SUM("AmountIn" - "AmountOut") as netBank 
                FROM "ReconciliationBankTransactions" 
                WHERE "ReconciliationPeriodID" = $1
            `, [periodId]);

            const actualNet = parseFloat(bankRes.rows[0].netbank || 0);

            const variance = actualNet - expectedNet;

            if (Math.abs(variance) < 0.01) {
                await client.query(`
                    UPDATE "ReconciliationPeriods"
                    SET "Status" = 'Reconciled', "BankBalanceVerified" = TRUE
                    WHERE "ReconciliationPeriodID" = $1
                `, [periodId]);
                return { success: true, status: 'Reconciled', variance: 0 };
            } else {
                await client.query(`
                    UPDATE "ReconciliationPeriods" SET "Status" = 'Exception' WHERE "ReconciliationPeriodID" = $1
                `, [periodId]);

                await client.query(`
                    INSERT INTO "ReconciliationExceptions"
                    ("ReconciliationPeriodID", "ExceptionType", "ExpectedAmount", "ActualAmount", "VarianceAmount", "Description", "RaisedBy", "Status")
                    VALUES ($1, 'Balance Mismatch', $2, $3, $4, 'Net amount does not update bank txns', $5, 'Open')
                `, [periodId, expectedNet, actualNet, variance, userId]);

                return { success: false, status: 'Exception', variance };
            }
        });

        return NextResponse.json(result);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
