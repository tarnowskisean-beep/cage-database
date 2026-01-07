const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres",
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    try {
        console.log("Checking for MailCode column...");

        // Check if exists
        const checkRes = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='Donations' AND column_name='MailCode';
        `);

        if (checkRes.rows.length > 0) {
            console.log("✅ MailCode column already exists.");
        } else {
            console.log("⚠️ Adding MailCode column...");
            await pool.query(`ALTER TABLE "Donations" ADD COLUMN "MailCode" VARCHAR(50);`);
            console.log("✅ Column added successfully.");
        }

    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        pool.end();
    }
}

migrate();
