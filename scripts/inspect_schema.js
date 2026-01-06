
const { query } = require('../lib/db');

async function main() {
    try {
        console.log('--- Donations Table ---');
        const donations = await query('SELECT * FROM "Donations" LIMIT 1');
        if (donations.rows.length > 0) {
            console.log(Object.keys(donations.rows[0]));
        } else {
            console.log('No donations found, cannot inspect schema from rows.');
            // Fallback: Query information_schema
            const schema = await query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'Donations'
            `);
            console.log(schema.rows.map(r => r.column_name));
        }

        console.log('\n--- Donors Table ---');
        const donors = await query('SELECT * FROM "Donors" LIMIT 1');
        if (donors.rows.length > 0) {
            console.log(Object.keys(donors.rows[0]));
        } else {
            const schema = await query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'Donors'
            `);
            console.log(schema.rows.map(r => r.column_name));
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

main();
