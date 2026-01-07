
import { query } from '../lib/db';

async function inspect() {
    try {
        console.log('--- ReconciliationPeriods Schema ---');
        const cols = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ReconciliationPeriods'
            ORDER BY column_name;
        `);
        console.table(cols.rows);

        console.log('--- Period 13 Data ---');
        const p13 = await query(`SELECT * FROM "ReconciliationPeriods" WHERE "ReconciliationPeriodID" = 13`);
        console.table(p13.rows);

    } catch (e) {
        console.error(e);
    }
}

inspect();
