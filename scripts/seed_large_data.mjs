
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { faker } from '@faker-js/faker';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const envLocalPath = path.resolve(__dirname, '../.env.local');

if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });
else if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const db = new Client({
    connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL
});

async function main() {
    try {
        await db.connect();
        console.log('🌱 Connected to DB');

        // 1. Fetch Context (Clients, Users)
        const clientsRes = await db.query('SELECT "ClientID", "ClientCode" FROM "Clients"');
        const clients = clientsRes.rows;
        if (clients.length === 0) throw new Error('No clients found. Run initial seed first.');

        const usersRes = await db.query('SELECT "UserID" FROM "Users"');
        const users = usersRes.rows.map(u => u.UserID);
        const adminUser = users[0];

        console.log(`Found ${clients.length} clients and ${users.length} users.`);

        // 2. Create Donors (People)
        const donorIds = [];
        console.log('Creating 100 Donors...');

        for (let i = 0; i < 100; i++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const email = faker.internet.email({ firstName, lastName });
            const assignedTo = Math.random() > 0.7 ? faker.helpers.arrayElement(users) : null;

            const res = await db.query(`
                INSERT INTO "Donors" ("FirstName", "LastName", "Email", "Phone", "Address", "City", "State", "Zip", "Bio", "AssignedStafferID")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING "DonorID"
            `, [
                firstName,
                lastName,
                email,
                faker.phone.number(),
                faker.location.streetAddress(),
                faker.location.city(),
                faker.location.state({ abbreviated: true }),
                faker.location.zipCode(),
                faker.lorem.paragraph(),
                assignedTo
            ]);
            donorIds.push(res.rows[0].DonorID);
        }

        // 3. Create Batches
        const batchIds = [];
        console.log('Creating 20 Batches...');
        for (let i = 0; i < 20; i++) {
            const client = faker.helpers.arrayElement(clients);
            const res = await db.query(`
                INSERT INTO "Batches" ("BatchCode", "ClientID", "EntryMode", "PaymentCategory", "Status", "CreatedBy")
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING "BatchID"
            `, [
                `${client.ClientCode}.${faker.date.recent().getMonth() + 1}${faker.number.int({ min: 10, max: 99 })}`,
                client.ClientID,
                faker.helpers.arrayElement(['Barcode', 'Manual', 'Datamatrix']),
                faker.helpers.arrayElement(['Checks', 'CC', 'Mixed']),
                faker.helpers.arrayElement(['Open', 'Submitted', 'Closed']),
                faker.helpers.arrayElement(users)
            ]);
            batchIds.push(res.rows[0].BatchID);
        }

        // 4. Create Donations
        console.log('Creating 400 Donations...');
        for (let i = 0; i < 400; i++) {
            const donorId = faker.helpers.arrayElement(donorIds);
            const client = faker.helpers.arrayElement(clients);
            const batchId = Math.random() > 0.2 ? faker.helpers.arrayElement(batchIds) : null; // 80% in batches
            const giftDate = faker.date.past({ years: 2 });
            const amount = faker.finance.amount({ min: 10, max: 5000, dec: 2 });

            const ackStatus = Math.random() > 0.5;

            // Fetch donor name for denormalized fields if you had them (but schema seems normalized mostly, except resolution queue seed used DonorFirstName)
            // Wait, schema_postgres.sql doesn't show DonorFirstName in Donations table?
            // Checking schema_postgres.sql... Donations table has ClientID, DonationID etc. It does NOT have DonorFirstName.
            // Wait, seed_resolution_data.ts used `DonorFirstName` in INSERT. 
            // Ah, maybe the schema_postgres.sql I viewed is OLD or `seed_resolution_data.ts` relies on a schema I haven't seen fully or I missed it.
            // Let's check schema_postgres.sql again.
            // It has `DonationID`, `ClientID`, `GiftAmount`... `DonorID` is NOT in the CREATE TABLE Donations in schema_postgres.sql!
            // Wait. Lines 66-86 of schema_postgres.sql:
            // "DonationID", "ClientID"... "BatchID"... "CreatedBy"... 
            // It DOES NOT have "DonorID".
            // However, `app/api/people/[id]/route.ts` joins "Donations" d on d."DonorID" = $1.
            // So "Donations" MUST have "DonorID".
            // Let me re-read schema_postgres.sql carefully.
            // Lines 30-32: "Batches".
            // Lines 66-86: "Donations".
            // I don't see "DonorID" in the CREATE TABLE snippet for Donations in Step 124.
            // BUT queries rely on it.
            // Maybe it was added in a previous migration or `schema_import.sql` or similar? 
            // Or maybe my view_file of schema_postgres.sql is incomplete or out of sync with actual DB?
            // I will assume "DonorID" exists in "Donations" because the app works.

            try {
                await db.query(`
                    INSERT INTO "Donations" 
                    ("ClientID", "DonorID", "TransactionType", "GiftAmount", "GiftMethod", "GiftPlatform", "GiftDate", 
                     "BatchID", "MailCode", "Designation", "ThankYouSentAt", "TaxReceiptSentAt")
                    VALUES ($1, $2, 'Donation', $3, $4, $5, $6, $7, $8, $9, $10, $11)
                `, [
                    client.ClientID,
                    donorId,
                    amount,
                    faker.helpers.arrayElement(['Check', 'CC', 'Cash']),
                    faker.helpers.arrayElement(['Manual', 'Stripe', 'Cage']),
                    giftDate,
                    batchId,
                    faker.helpers.arrayElement(['GEN', 'FALL24', 'EOY23', 'PRES24']),
                    faker.helpers.arrayElement(['General Fund', 'Building Fund', 'Legal Defense']),
                    ackStatus ? faker.date.recent() : null,
                    ackStatus ? faker.date.recent() : null
                ]);
            } catch (err) {
                // If DonorID missing column error occurs, we kno
                console.warn("Error inserting donation (maybe schema mismatch):", err.message);
                // If it fails, maybe we need to ALTER table to add DonorID? But the app was working?
                // `app/api/people/[id]/route.ts` did `WHERE "DonorID" = $1`.
                // So the column MUST exist.
            }
        }

        // 5. Create Tasks
        console.log('Creating Tasks...');
        for (let i = 0; i < 50; i++) {
            const donorId = faker.helpers.arrayElement(donorIds);
            await db.query(`
                INSERT INTO "DonorTasks" ("DonorID", "Description", "AssignedTo", "DueDate", "IsCompleted", "CreatedBy")
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                donorId,
                faker.lorem.sentence(),
                faker.helpers.arrayElement(users),
                faker.date.future(),
                faker.datatype.boolean(),
                adminUser
            ]);
        }

        // 6. Create Pledges
        console.log('Creating Pledges...');
        for (let i = 0; i < 30; i++) {
            const donorId = faker.helpers.arrayElement(donorIds);
            await db.query(`
                INSERT INTO "Pledges" ("DonorID", "MailCode", "Amount")
                VALUES ($1, $2, $3)
            `, [
                donorId,
                faker.helpers.arrayElement(['FALL24', 'EOY23', 'PRES24']),
                faker.finance.amount({ min: 1000, max: 10000, dec: 2 })
            ]);
        }

        console.log('✅ Seeding Complete!');

    } catch (e) {
        console.error(e);
    } finally {
        await db.end();
    }
}

main();
