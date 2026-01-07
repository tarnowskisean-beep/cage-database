
import { query } from '../lib/db';

async function runHealthCheck() {
    console.log('🏥 Starting System Health Check...');
    let passed = true;

    const check = async (name: string, fn: () => Promise<boolean>) => {
        try {
            process.stdout.write(`Testing ${name}... `);
            const result = await fn();
            if (result) {
                console.log('✅ PASS');
            } else {
                console.log('❌ FAIL');
                passed = false;
            }
        } catch (e: any) {
            console.log(`❌ ERROR: ${e.message}`);
            passed = false;
        }
    };

    // 1. Database Connection
    await check('Database Connection', async () => {
        const res = await query('SELECT 1 as val');
        return res.rows[0].val === 1;
    });

    // 2. People Stats API Readiness (Simulate Query)
    await check('People Stats Logic', async () => {
        // Count Pending Resolutions
        const res = await query(`SELECT COUNT(*) as count FROM "Donations" WHERE "ResolutionStatus" = 'Pending'`);
        const count = parseInt(res.rows[0].count);
        // We expect > 0 because we seeded 2 smart matches
        return count > 0;
    });

    // 3. Resolution Queue Data Integrity (Jon Skywalker)
    await check('Resolution Queue: Jon Skywalker', async () => {
        const res = await query(`
            SELECT d."DonorFirstName", d."DonorLastName" 
            FROM "Donations" d
            WHERE d."ResolutionStatus" = 'Pending' 
            AND d."DonorFirstName" = 'Jon' 
            AND d."DonorLastName" = 'Skywalker'
        `);
        return res.rows.length > 0;
    });

    // 4. Resolution Candidates (Fuzzy Match linked?)
    await check('Resolution Candidates Linked', async () => {
        const res = await query(`
            SELECT COUNT(*) as count 
            FROM "DonationResolutionCandidates" 
            WHERE "Reason" LIKE 'Fuzzy %'
        `);
        return parseInt(res.rows[0].count) > 0;
    });

    // 5. Client Bank Accounts Schema
    await check('Schema: Client Bank Accounts', async () => {
        const res = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'ClientBankAccounts' 
            AND column_name = 'AccountType'
        `);
        return res.rows.length > 0;
    });

    // 6. Batches Schema (AccountID)
    await check('Schema: Batches has AccountID', async () => {
        const res = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Batches' 
            AND column_name = 'AccountID'
        `);
        return res.rows.length > 0;
    });

    // 7. Check for Broken Batches (Migrated Codes)
    await check('Data: Batch Codes Standardized', async () => {
        // Check if we have any batches that look like old format? 
        // Or check if we have batches with the NEW format dots
        const res = await query(`
            SELECT COUNT(*) as count 
            FROM "Batches" 
            WHERE "BatchCode" LIKE '%.%.%.%.%'
        `);
        // We migrated 1700+, so should be plenty
        return parseInt(res.rows[0].count) > 100;
    });

    console.log('\n---------------------------------');
    if (passed) {
        console.log('🎉 SYSTEM HEALTHY. Ready for use.');
    } else {
        console.log('⚠️ SYSTEM HAS ISSUES. See above.');
        process.exit(1);
    }
}

runHealthCheck();
