import { resolveBatchDonations } from '@/lib/people';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // @ts-ignore
    const userId = session.user?.id;

    // Fix: Await params
    const { id: periodId } = await params;

    try {
        const result = await transaction(async (client) => {
            // 1. Get Financials
            const detailsRes = await client.query(`SELECT "AmountDonorNet", "BatchID" FROM "ReconciliationBatchDetails" WHERE "ReconciliationPeriodID" = $1`, [periodId]);

            // Calculate total expected
            const expectedNet = detailsRes.rows.reduce((sum, row) => sum + parseFloat(row.AmountDonorNet || 0), 0);

            // Collect Batch IDs for Identity Resolution
            const batchIds = detailsRes.rows.map(r => r.BatchID).filter(id => id);

            const bankRes = await client.query(`
                SELECT SUM("AmountIn" - "AmountOut") as netBank 
                FROM "ReconciliationBankTransactions" 
                WHERE "ReconciliationPeriodID" = $1
            `, [periodId]);

            const actualNet = parseFloat(bankRes.rows[0].netbank || 0);

            const variance = actualNet - expectedNet;

            if (Math.abs(variance) < 0.01) {
                // SUCCESS: Logic

                // 1. Trigger Identity Resolution (Async or Await?)
                // We await it to ensure data consistency before calling it "Done".
                if (batchIds.length > 0) {
                    await resolveBatchDonations(batchIds);
                }

                await client.query(`
                    UPDATE "ReconciliationPeriods"
                    SET "Status" = 'Reconciled', "BankBalanceVerified" = TRUE
                    WHERE "ReconciliationPeriodID" = $1
                `, [periodId]);
                return { success: true, status: 'Reconciled', variance: 0 };
            } else {
                // FAILURE: Exception
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
        console.error("Reconciliation Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
