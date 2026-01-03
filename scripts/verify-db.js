
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function checkUsers() {
    try {
        const res = await pool.query('SELECT "UserID", "Username", "Email", "Role", "PasswordHash" FROM "Users"');
        console.log('User count:', res.rowCount);
        console.log('Users:', res.rows.map(u => ({ ...u, PasswordHash: u.PasswordHash ? 'HASHED' : 'NULL' })));
    } catch (e) {
        console.error('Error querying users:', e);
    } finally {
        await pool.end();
    }
}

checkUsers();
