require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({
    connectionString: "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();

        console.log("Adding DonorEmail, DonorPhone, OrganizationName to Donations...");

        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorEmail" TEXT;`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "DonorPhone" TEXT;`);
        await client.query(`ALTER TABLE "Donations" ADD COLUMN IF NOT EXISTS "OrganizationName" TEXT;`);

        console.log("✅ Columns Added Successfully.");
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
