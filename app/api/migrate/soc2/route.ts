
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        console.log('Running SOC 2 Migrations...');

        // 1. Policies Table
        await query(`
            CREATE TABLE IF NOT EXISTS "Policies" (
                "PolicyID" SERIAL PRIMARY KEY,
                "PolicyType" TEXT NOT NULL, -- 'TermsOfService', 'PrivacyPolicy'
                "Version" TEXT NOT NULL, -- '1.0', '2026-01-01'
                "Content" TEXT NOT NULL, -- HTML or Markdown content
                "IsActive" BOOLEAN DEFAULT TRUE,
                "CreatedAt" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 2. User Policy Acceptances
        await query(`
            CREATE TABLE IF NOT EXISTS "PolicyAcceptances" (
                "AcceptanceID" SERIAL PRIMARY KEY,
                "UserID" INT REFERENCES "Users"("UserID"),
                "PolicyID" INT REFERENCES "Policies"("PolicyID"),
                "AcceptedAt" TIMESTAMPTZ DEFAULT NOW(),
                "IPAddress" TEXT,
                UNIQUE("UserID", "PolicyID")
            );
        `);

        // 3. Automated Maintenance Log (to track cron jobs)
        await query(`
            CREATE TABLE IF NOT EXISTS "MaintenanceLogs" (
                "LogID" SERIAL PRIMARY KEY,
                "JobName" TEXT NOT NULL,
                "Status" TEXT NOT NULL,
                "Details" TEXT,
                "Timestamp" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 4. Audit Logs (SOC 2 Requirement)
        await query(`
            CREATE TABLE IF NOT EXISTS "AuditLogs" (
                "LogID" SERIAL PRIMARY KEY,
                "UserID" INT REFERENCES "Users"("UserID"),
                "Action" TEXT NOT NULL,
                "EntityID" TEXT,
                "Details" TEXT,
                "IPAddress" TEXT,
                "Timestamp" TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Seed Initial Policies if empty
        const policyCheck = await query('SELECT COUNT(*) as count FROM "Policies"');
        if (parseInt(policyCheck.rows[0].count) === 0) {
            await query(`
                INSERT INTO "Policies" ("PolicyType", "Version", "Content", "IsActive")
                VALUES 
                ('TermsOfService', '1.0', '<h1>Terms of Service</h1><p>Welcome to Compass CPA. By using this system you agree to confidentiality reqs...</p>', TRUE),
                ('PrivacyPolicy', '1.0', '<h1>Privacy Policy</h1><p>We handle your data with care...</p>', TRUE)
            `);
        }

        return NextResponse.json({ success: true, message: 'SOC 2 Tables Created & Seeded' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
