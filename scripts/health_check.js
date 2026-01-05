
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function healthCheck() {
    const client = await pool.connect();
    try {
        console.log('🏥 SYSTEM HEALTH CHECK');
        console.log('======================');

        // 1. Database Connection
        const time = await client.query('SELECT NOW()');
        console.log(`✅ Database Connected: ${time.rows[0].now}`);

        // 2. Data Volume Check (Jan 2026)
        const janStats = await client.query(`
            SELECT COUNT(*) as count, SUM("GiftAmount") as total 
            FROM "Donations" 
            WHERE "GiftDate" >= '2026-01-01'
        `);
        const totalRev = parseFloat(janStats.rows[0].total || 0);
        console.log(`\n📊 Jan 2026 Revenue: $${(totalRev / 1000000).toFixed(2)}M (${janStats.rows[0].count} txns)`);

        if (totalRev > 40000000) console.log('   ✅ Revenue Target Met (>40M)');
        else console.warn('   ⚠️ Revenue Low (<40M)');

        // 3. Platform Normalization Check
        const platforms = await client.query(`
            SELECT "GiftPlatform", COUNT(*) 
            FROM "Donations" 
            WHERE "GiftDate" >= '2026-01-01'
            GROUP BY "GiftPlatform"
        `);
        console.log('\n🏷️  Platform Distribution:');
        console.table(platforms.rows);

        // 4. Audit Log Check
        const audits = await client.query('SELECT COUNT(*) FROM "AuditLogs"');
        console.log(`\n🛡️  Audit Logs: ${audits.rows[0].count} records`);

        // 5. Batches Check
        const batches = await client.query('SELECT COUNT(*), "Status" FROM "Batches" GROUP BY "Status"');
        console.log('\n📂 Batch Status:');
        batches.rows.forEach(r => console.log(`   - ${r.Status}: ${r.count}`));

        console.log('\n✅ HEALTH CHECK COMPLETE');

    } catch (err) {
        console.error('❌ HEALTH CHECK FAILED:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

healthCheck();
