
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Starting index optimization...');

        const indexes = [
            // Batches Table
            `CREATE INDEX IF NOT EXISTS "idx_batches_clientid" ON "Batches" ("ClientID");`,
            `CREATE INDEX IF NOT EXISTS "idx_batches_status" ON "Batches" ("Status");`,
            `CREATE INDEX IF NOT EXISTS "idx_batches_date" ON "Batches" ("Date");`,
            `CREATE INDEX IF NOT EXISTS "idx_batches_createdby" ON "Batches" ("CreatedBy");`,

            // Donations Table
            `CREATE INDEX IF NOT EXISTS "idx_donations_batchid" ON "Donations" ("BatchID");`,
            `CREATE INDEX IF NOT EXISTS "idx_donations_clientid" ON "Donations" ("ClientID");`,
            `CREATE INDEX IF NOT EXISTS "idx_donations_giftdate" ON "Donations" ("GiftDate");`,
            // Composite index for fast stats?
            `CREATE INDEX IF NOT EXISTS "idx_donations_client_date" ON "Donations" ("ClientID", "GiftDate");`,

            // Clients Table
            `CREATE INDEX IF NOT EXISTS "idx_clients_clientcode" ON "Clients" ("ClientCode");`,

            // Ensure Foreign Keys have constraints (should be done in schema, but indexes help performance regardless)
        ];

        const results = [];
        for (const idxSql of indexes) {
            try {
                // We use our query helper. Note: CREATE INDEX cannot run inside a transaction block 
                // easily with other commands in some drivers, but here we just run them sequentially.
                await query(idxSql);
                results.push({ sql: idxSql, status: 'Success' });
            } catch (err: any) {
                console.error(`Failed to create index: ${idxSql}`, err);
                results.push({ sql: idxSql, status: 'Failed', error: err.message });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Index optimization complete.',
            details: results
        });

    } catch (error: any) {
        console.error('Index fix error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
