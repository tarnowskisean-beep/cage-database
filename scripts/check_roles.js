const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function checkRoles() {
    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        console.log('Checking distinct User Roles...');

        const res = await client.query(`
            SELECT DISTINCT "Role" FROM "Users";
        `);

        console.table(res.rows);

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await client.end();
    }
}

checkRoles();
