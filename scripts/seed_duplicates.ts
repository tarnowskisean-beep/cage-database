
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:dadmy9-hoRqeg-budvyg@db.lrrlssecgkeqztwpkeca.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
});

async function query(text: string, params?: unknown[]) {
    return pool.query(text, params);
}
import { faker } from '@faker-js/faker';

async function seedDuplicates() {
    console.log('Seeding duplicates...');

    // 1. Create a "Real" Donor
    const email = faker.internet.email();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const address = faker.location.streetAddress();

    const realDonor = await query(`
        INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Address", "City", "State", "Zip", "CreatedAt")
        VALUES ($1, $2, $3, $4, 'New York', 'NY', '10001', NOW())
        RETURNING "DonorID"
    `, [firstName, lastName, email, address]);
    const realId = realDonor.rows[0].DonorID;
    console.log(`Created Real Donor: ${realId} (${email})`);

    // 2. Create a Duplicate Donor (Same Email, different ID)
    const dupDonor = await query(`
        INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Address", "City", "State", "Zip", "CreatedAt")
        VALUES ($1, $2, $3, $4, 'New York', 'NY', '10001', NOW())
        RETURNING "DonorID"
    `, [firstName, lastName, email, address]);
    const dupId = dupDonor.rows[0].DonorID;
    console.log(`Created Duplicate Donor: ${dupId} (${email})`);

    // 3. Create a Duplicate Name Donor (Same Name, different Email/Address)
    const dupNameDonor = await query(`
        INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Address", "City", "State", "Zip", "CreatedAt")
        VALUES ($1, $2, 'different@email.com', '999 Other St', 'New York', 'NY', '10001', NOW())
        RETURNING "DonorID"
    `, [firstName, lastName]);
    const dupNameId = dupNameDonor.rows[0].DonorID;
    console.log(`Created Duplicate Name Donor: ${dupNameId} (${firstName} ${lastName})`);

    // Give the duplicate some complexity (a donation)
    await query(`
        INSERT INTO "Donations" ("ClientID", "GiftAmount", "GiftDate", "DonorID", "TransactionType", "GiftMethod", "GiftPlatform")
        VALUES (1, 100.00, NOW(), $1, 'Donation', 'Check', 'Cage')
    `, [dupId]);
    console.log(`Added donation to duplicate donor ${dupId}`);

    console.log('Done.');
}

seedDuplicates().catch(console.error);
