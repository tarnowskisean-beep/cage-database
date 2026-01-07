const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function testStats() {
    try {
        console.log('Testing Stats Query...');

        // 1. Total Revenue
        const revenueRes = await pool.query('SELECT SUM(d."GiftAmount") as total FROM "Donations" d');
        console.log('Revenue Raw:', revenueRes.rows[0]);
        console.log('Revenue Type:', typeof revenueRes.rows[0].total);

        // 2. Revenue by Client
        const clientRes = await pool.query(`
            SELECT c."ClientName", SUM(d."GiftAmount") as total 
            FROM "Donations" d 
            JOIN "Clients" c ON d."ClientID" = c."ClientID" 
            GROUP BY c."ClientName"
            ORDER BY total DESC
        `);
        console.log('By Client (First 3):', clientRes.rows.slice(0, 3));

        process.exit(0);
    } catch (err) {
        console.error('Query Failed:', err);
        process.exit(1);
    }
}

testStats();
