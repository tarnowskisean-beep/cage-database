
import { query } from '../lib/db';

async function addFakeDonor() {
    try {
        console.log('Adding fake donor with CagingID 12345...');

        // Check if exists
        const check = await query('SELECT "DonorID" FROM "Donors" WHERE "CagingID" = $1', ['12345']);
        if (check.rows.length > 0) {
            console.log('Donor with CagingID 12345 already exists. ID:', check.rows[0].DonorID);
            return;
        }

        const res = await query(`
            INSERT INTO "Donors" 
            ("FirstName", "LastName", "CagingID", "Email", "Address", "City", "State", "Zip", "CreatedAt", "UpdatedAt")
            VALUES 
            ('Fake', 'Donor', '12345', 'fake.12345@example.com', '123 Fake St', 'Faketown', 'FK', '00000', NOW(), NOW())
            RETURNING "DonorID"
        `);

        console.log('✅ Added Fake Donor. ID:', res.rows[0].DonorID);
    } catch (e) {
        console.error('Error adding donor:', e);
    }
}

addFakeDonor();
