const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function listTables() {
    const client = await pool.connect();
    try {
        console.log('Listing tables...');
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        console.log('Tables found:', res.rows.map(r => r.table_name));

        console.log('\nChecking Donors table columns if it exists...');
        const donors = res.rows.find(r => r.table_name === 'Donors');
        if (donors) {
            const cols = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'Donors';
            `);
            console.log('Donors columns:', cols.rows);
        } else {
            console.log('Donors table NOT found.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

listTables();
