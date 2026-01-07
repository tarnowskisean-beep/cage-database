
import { query } from '../lib/db';

async function secureTables() {
    try {
        console.log('🔒 Securing Tables...');

        // 1. DonationResolutionCandidates
        // This table is high-traffic during resolution. 
        // We want all authenticated users to read/insert, but only Admins/Staff to delete?
        // For now, let's just restrict to "Authenticated Users".
        console.log(' - Enabling RLS on DonationResolutionCandidates...');
        await query(`ALTER TABLE "DonationResolutionCandidates" ENABLE ROW LEVEL SECURITY;`);
        await query(`DROP POLICY IF EXISTS "Enable all for authenticated" ON "DonationResolutionCandidates";`);
        await query(`
            CREATE POLICY "Enable all for authenticated" ON "DonationResolutionCandidates"
            FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        `);

        // 2. DonorFiles
        // Should be linked to Client? 
        // For now, restrict to authenticated users.
        console.log(' - Enabling RLS on DonorFiles...');
        await query(`ALTER TABLE "DonorFiles" ENABLE ROW LEVEL SECURITY;`);
        await query(`DROP POLICY IF EXISTS "Enable all for authenticated" ON "DonorFiles";`);
        await query(`
            CREATE POLICY "Enable all for authenticated" ON "DonorFiles"
            FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        `);

        // 3. DonorTasks
        console.log(' - Enabling RLS on DonorTasks...');
        await query(`ALTER TABLE "DonorTasks" ENABLE ROW LEVEL SECURITY;`);
        await query(`DROP POLICY IF EXISTS "Enable all for authenticated" ON "DonorTasks";`);
        await query(`
            CREATE POLICY "Enable all for authenticated" ON "DonorTasks"
            FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
        `);

        console.log('✅ All tables secured.');

    } catch (e: any) {
        if (e.message.includes('auth.role')) {
            console.log('⚠️  Note: "auth.role()" is a Supabase specific function. If this fails locally, it means we are not running against Supabase or the function is missing. Since we are connecting via POSTGRES_URL which points to Supabase, this should work. If it fails, we might need a simpler policy like TRUE for testing if local.');
        }
        console.error('Error securing tables:', e);
    }
}

secureTables();
