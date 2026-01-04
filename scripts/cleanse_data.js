
const { Client } = require('pg');

const CONNECTION_STRING = 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres';

async function run() {
    console.log("🧼 STARTING DATA CLEANSE...");

    const client = new Client({
        connectionString: CONNECTION_STRING,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("✅ DB Connected.");

        // 1. Title Case Function (if not exists)
        // Simple initcap is good enough for most, but let's be standardised.
        // PostgreSQL has INITCAP() built-in.

        // 2. NAMES: InitCap
        console.log("🔹 Normalizing Names (Title Case)...");
        await client.query(`
            UPDATE "Donations"
            SET 
                "DonorFirstName" = INITCAP(TRIM("DonorFirstName")),
                "DonorMiddleName" = INITCAP(TRIM("DonorMiddleName")),
                "DonorLastName" = INITCAP(TRIM("DonorLastName")),
                "DonorCity" = INITCAP(TRIM("DonorCity"))
        `);

        // 3. EMAILS: Lowercase
        console.log("🔹 Normalizing Emails (Lowercase)...");
        await client.query(`
            UPDATE "Donations"
            SET "DonorEmail" = LOWER(TRIM("DonorEmail"))
            WHERE "DonorEmail" IS NOT NULL
        `);

        // 4. PHONES: Format components
        // Complex regex to format (XXX) XXX-XXXX
        console.log("🔹 Normalizing Phones...");
        await client.query(`
            UPDATE "Donations"
            SET "DonorPhone" = 
                '(' || SUBSTRING(REGEXP_REPLACE("DonorPhone", '[^0-9]', '', 'g') FROM 1 FOR 3) || ') ' ||
                SUBSTRING(REGEXP_REPLACE("DonorPhone", '[^0-9]', '', 'g') FROM 4 FOR 3) || '-' ||
                SUBSTRING(REGEXP_REPLACE("DonorPhone", '[^0-9]', '', 'g') FROM 7 FOR 4)
            WHERE LENGTH(REGEXP_REPLACE("DonorPhone", '[^0-9]', '', 'g')) = 10
        `);

        // 5. STATES: Uppercase & Trim
        console.log("🔹 Normalizing States (Uppercase)...");
        await client.query(`
            UPDATE "Donations"
            SET "DonorState" = UPPER(TRIM("DonorState"))
        `);

        // 6. ADDRESSES: Title Case & Abbreviate
        // Basic Title Case first
        console.log("🔹 Normalizing Addresses...");
        await client.query(`
            UPDATE "Donations"
            SET "DonorAddress" = INITCAP(TRIM("DonorAddress"))
        `);

        // Manual Replacements for Street Types (Common ones)
        const replacements = [
            [" Street", " St"], [" Road", " Rd"], [" Avenue", " Ave"], [" Drive", " Dr"],
            [" Lane", " Ln"], [" Boulevard", " Blvd"], [" Court", " Ct"], [" Circle", " Cir"],
            [" Apartment", " Apt"], [" Suite", " Ste"], [" Unit", " Unit"],
            [" North ", " N "], [" South ", " S "], [" East ", " E "], [" West ", " W "],
        ];

        for (const [full, abbr] of replacements) {
            // Case insensitive replacement using regex logic requires careful SQL or just replace INITCAPd versions since we just initcapped.
            // Example: "Main Street" -> "Main St"
            await client.query(`
                UPDATE "Donations"
                SET "DonorAddress" = REPLACE("DonorAddress", $1, $2)
                WHERE "DonorAddress" LIKE '%' || $1 || '%'
            `, [full, abbr]);
        }

        console.log("✨ DATA CLEANSE COMPLETE!");

    } catch (e) {
        console.error("❌ Error cleaning data:", e);
    } finally {
        await client.end();
        console.log("🔌 Disconnected.");
    }
}

run();
