
import { query } from '../lib/db';

async function inspect() {
    try {
        console.log('--- COLUMNS ---');
        const cols = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'Donations'
            ORDER BY column_name;
        `);
        console.table(cols.rows);

        console.log('--- TRIGGERS ---');
        const triggers = await query(`
            SELECT trigger_name, event_manipulation, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'Donations';
        `);
        console.table(triggers.rows);

    } catch (e) {
        console.error(e);
    }
}

inspect();
