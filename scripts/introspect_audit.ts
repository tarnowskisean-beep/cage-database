
import { query } from '../lib/db';

async function introspect() {
    try {
        const res = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'AuditLogs'
        `);
        console.log('AuditLogs Columns:', res.rows);
    } catch (e) {
        console.error(e);
    }
}

introspect();
