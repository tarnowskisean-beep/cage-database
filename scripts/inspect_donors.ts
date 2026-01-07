
import { query } from '../lib/db';

async function inspect() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Donors'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    }
}

inspect();
