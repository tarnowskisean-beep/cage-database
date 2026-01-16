
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const results = [];

        // 1. Fix Donations Schema
        await query(`
            ALTER TABLE "Donations" 
            ADD COLUMN IF NOT EXISTS "ResolutionStatus" TEXT DEFAULT 'Resolved',
            ADD COLUMN IF NOT EXISTS "ReceiptYear" INT,
            ADD COLUMN IF NOT EXISTS "ReceiptQuarter" TEXT,
            ADD COLUMN IF NOT EXISTS "IsInactive" BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "GiftPlatform" TEXT,
            ADD COLUMN IF NOT EXISTS "TransactionType" TEXT,
            ADD COLUMN IF NOT EXISTS "DonorPrefix" TEXT,
            ADD COLUMN IF NOT EXISTS "GiftYear" INT,
            ADD COLUMN IF NOT EXISTS "GiftQuarter" TEXT,
            ADD COLUMN IF NOT EXISTS "CampaignID" TEXT;
        `);
        results.push('Donations table columns verified.');

        // 2. Fix Donors Schema (Alerts & CagingID)
        await query(`
            ALTER TABLE "Donors" 
            ADD COLUMN IF NOT EXISTS "AlertMessage" TEXT,
            ADD COLUMN IF NOT EXISTS "HasAlert" BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS "CagingID" TEXT;
        `);
        results.push('Donors table columns verified.');

        // 3. Add Indexes
        await query(`CREATE INDEX IF NOT EXISTS idx_donors_cagingid ON "Donors" ("CagingID");`);
        results.push('Index idx_donors_cagingid verified.');

        // 4. Create AuditLogs if missing
        await query(`
            CREATE TABLE IF NOT EXISTS "AuditLogs" (
                "LogID" SERIAL PRIMARY KEY,
                "UserID" INT,
                "Action" TEXT NOT NULL,
                "EntityID" TEXT,
                "Details" TEXT,
                "IPAddress" TEXT,
                "CreatedAt" TIMESTAMP DEFAULT NOW()
            );
        `);
        results.push('AuditLogs table verified.');

        return NextResponse.json({ success: true, log: results });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
