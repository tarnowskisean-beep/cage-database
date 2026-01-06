const { Pool } = require('pg');

const pool = new Pool({
    connectionString: 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function checkTriggers() {
    try {
        const res = await pool.query(`
            SELECT event_object_table as table_name, trigger_name
            FROM information_schema.triggers
            WHERE event_object_table = 'Donations'
            GROUP BY table_name, trigger_name
        `);
        console.log('Triggers on Donations:', res.rows);

        // If we find a trigger, let's get its definition
        if (res.rows.length > 0) {
            for (const row of res.rows) {
                const funcRes = await pool.query(`
                    SELECT pg_get_triggerdef(oid) as def
                    FROM pg_trigger
                    WHERE tgname = $1
                `, [row.trigger_name]);
                if (funcRes.rows.length > 0) {
                    console.log(`Definition for ${row.trigger_name}:`, funcRes.rows[0].def);
                }
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkTriggers();
