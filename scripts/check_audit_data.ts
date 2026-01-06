
import { query } from '../lib/db';

async function checkAudit() {
    try {
        console.log('Checking AuditLogs table...');
        const countRes = await query('SELECT COUNT(*) as total FROM "AuditLogs"');
        console.log(`Total Audit Logs: ${countRes.rows[0].total}`);

        if (parseInt(countRes.rows[0].total) > 0) {
            const logs = await query('SELECT * FROM "AuditLogs" ORDER BY "CreatedAt" DESC LIMIT 5');
            console.log('Recent Logs:', logs.rows);
        } else {
            console.log('Table is empty. Inserting a test log...');
            // Need a valid UserID. Let's find one.
            const userRes = await query('SELECT "UserID" FROM "Users" LIMIT 1');
            if (userRes.rows.length > 0) {
                const userId = userRes.rows[0].UserID;
                await query(
                    `INSERT INTO "AuditLogs" ("UserID", "Action", "EntityID", "Details", "IPAddress") 
                     VALUES ($1, 'TEST_LOG', '0', 'Manual Test Log', '127.0.0.1')`,
                    [userId]
                );
                console.log('Test log inserted.');
            } else {
                console.log('No users found to attach log to.');
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

checkAudit();
