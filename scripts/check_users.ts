
import { query } from '../lib/db';

async function checkUsers() {
    try {
        const res = await query('SELECT "UserID", "Username", "Email" FROM "Users"');
        console.log('Users:', res.rows);
    } catch (e) {
        console.error(e);
    }
}

checkUsers();
