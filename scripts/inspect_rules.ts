
import { query } from '../lib/db';

async function inspectRules() {
    try {
        const rules = await query(`
            SELECT * FROM pg_rules WHERE tablename = 'Donations';
        `);
        console.log('--- RULES ---');
        console.table(rules.rows);
    } catch (e) {
        console.error(e);
    }
}

inspectRules();
