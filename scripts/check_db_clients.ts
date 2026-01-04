
import { query } from '../lib/db';

async function checkClients() {
    try {
        console.log('Checking Clients table...');
        const result = await query('SELECT * FROM "Clients"');
        console.log(`Found ${result.rows.length} clients.`);
        if (result.rows.length > 0) {
            console.log('First client:', result.rows[0]);
        } else {
            console.log('Table is empty.');
        }
        process.exit(0);
    } catch (e) {
        console.error('Error checking clients:', e);
        process.exit(1);
    }
}

checkClients();
