
const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Renaming MailCode -> CampaignID in Donations...");
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='Donations' AND column_name='MailCode') THEN
                    ALTER TABLE "Donations" RENAME COLUMN "MailCode" TO "CampaignID";
                END IF;
            END $$;
        `);

        console.log("Renaming MailCode -> CampaignID in Pledges...");
        await client.query(`
            DO $$
            BEGIN
                IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='Pledges' AND column_name='MailCode') THEN
                    ALTER TABLE "Pledges" RENAME COLUMN "MailCode" TO "CampaignID";
                END IF;
            END $$;
        `);

        console.log("Migration Complete.");

    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
