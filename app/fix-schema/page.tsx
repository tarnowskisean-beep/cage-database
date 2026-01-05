
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function FixSchemaPage() {
    let status = 'Initializing...';
    const logs: string[] = [];

    const log = (msg: string) => logs.push(`[${new Date().toISOString().split('T')[1]}] ${msg}`);

    try {
        log('Starting Schema Fix...');

        // 1. Add Donations Columns
        const missingCols = [
            'MailCode', 'DonorPrefix', 'DonorFirstName', 'DonorMiddleName', 'DonorLastName', 'DonorSuffix',
            'DonorAddress', 'DonorCity', 'DonorState', 'DonorZip', 'DonorEmployer', 'DonorOccupation',
            'GiftCustodian', 'GiftConduit', 'PostMarkYear', 'PostMarkQuarter', 'Comment', 'OrganizationName',
            'DonorEmail', 'DonorPhone', 'CheckNumber', 'ScanString', 'GiftType', 'Version', 'GiftPledgeAmount', 'IsInactive',
            'UpdatedAt'
        ];

        for (const col of missingCols) {
            try {
                // Special handling for types
                let type = 'TEXT';
                if (col === 'Version') type = 'INT DEFAULT 1';
                if (col === 'GiftPledgeAmount') type = 'DECIMAL(18,2) DEFAULT 0';
                if (col === 'IsInactive') type = 'BOOLEAN DEFAULT FALSE';
                if (col === 'UpdatedAt') type = 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()';

                await query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "${col}" ${type}`);
                log(`Checked/Added Donation Column: ${col}`);
            } catch (e: any) {
                log(`⚠️ Error on ${col}: ${e.message}`);
            }
        }

        // 2. Add Batches Columns
        try {
            await query(`ALTER TABLE "Batches" ADD COLUMN IF NOT EXISTS "DefaultGiftType" TEXT`);
            await query(`ALTER TABLE "Batches" ADD COLUMN IF NOT EXISTS "Version" INT DEFAULT 1`);
            log('Checked Batches Columns');
        } catch (e: any) {
            log(`⚠️ Error on Batches: ${e.message}`);
        }

        // 3. Add Users Columns
        try {
            await query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "IsActive" BOOLEAN DEFAULT TRUE`);
            await query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Initials" TEXT`);
            log('Checked Users Columns (IsActive, Initials)');
        } catch (e: any) {
            log(`⚠️ Error on Users: ${e.message}`);
        }

        // 4. Add Clients Columns
        try {
            await query(`ALTER TABLE "Clients" ADD COLUMN IF NOT EXISTS "Status" TEXT DEFAULT 'Active'`);
            await query(`ALTER TABLE "Clients" ADD COLUMN IF NOT EXISTS "ClientType" TEXT`);
            await query(`ALTER TABLE "Clients" ADD COLUMN IF NOT EXISTS "LogoURL" TEXT`);

            // Check for LogoData bytea specifically
            const hasLogoData = await query(`SELECT column_name FROM information_schema.columns WHERE table_name='Clients' AND column_name='LogoData'`);
            if (hasLogoData.rows.length === 0) {
                await query(`ALTER TABLE "Clients" ADD COLUMN "LogoData" BYTEA`);
                await query(`ALTER TABLE "Clients" ADD COLUMN "MimeType" TEXT`);
                log('Added LogoData/MimeType columns');
            } else {
                log('Checked LogoData column');
            }

            log('Checked Clients Status, ClientType, LogoURL');
        } catch (e: any) {
            log(`⚠️ Error on Clients: ${e.message}`);
        }

        log('✅ Schema Fix Sequence Completed.');
        status = 'Success';

    } catch (err: any) {
        status = 'CRITICAL FAILURE';
        log(`🔥 Fatal Error: ${err.message}`);
    }

    return (
        <div className="p-8 font-mono max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Emergency Schema Fix</h1>
            <div className={`p-4 mb-4 rounded ${status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                Status: <strong>{status}</strong>
            </div>
            <div className="bg-gray-100 p-4 rounded text-sm overflow-auto h-96 border border-gray-300">
                {logs.map((l, i) => <div key={i} className="mb-1 border-b border-gray-200 pb-1">{l}</div>)}
            </div>
        </div>
    );
}
