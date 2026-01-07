
import { query } from '../lib/db';

async function checkRLS() {
    try {
        console.log('🛡️  Checking Row Level Security (RLS) Status...');
        const res = await query(`
            SELECT 
                tablename, 
                rowsecurity 
            FROM pg_tables 
            JOIN pg_class ON pg_class.relname = pg_tables.tablename 
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `);

        console.table(res.rows);

        const unsecured = res.rows.filter((r: any) => !r.rowsecurity);
        if (unsecured.length > 0) {
            console.log(`\n⚠️  Found ${unsecured.length} tables with RLS DISABLED:`);
            unsecured.forEach((u: any) => console.log(` - ${u.tablename}`));
        } else {
            console.log('\n✅ All tables have RLS enabled.');
        }

    } catch (e) {
        console.error(e);
    }
}

checkRLS();
