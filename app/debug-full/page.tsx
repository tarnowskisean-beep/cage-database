import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DebugFull() {
    const logs: string[] = [];
    let schemaDump: any[] = [];
    let userDump: any[] = [];
    let insertError = null;

    const log = (msg: string) => logs.push(`[${new Date().toISOString().split('T')[1]}] ${msg}`);

    try {
        log('--- START DIAGNOSTIC ---');

        // 1. Dump Users
        try {
            const resUsers = await query('SELECT "UserID", "Username", "Role", "IsActive" FROM "Users" ORDER BY "UserID" DESC LIMIT 5');
            userDump = resUsers.rows;
            log(`Found ${resUsers.rows.length} users (showing top 5)`);
        } catch (e: any) {
            log(`❌ Error fetching users: ${e.message}`);
        }

        // 2. Dump Donation Schema
        try {
            // Query Postgres information_schema
            const resSchema = await query(`
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'Donations'
            ORDER BY column_name
        `);
            schemaDump = resSchema.rows;
            log(`Fetched ${resSchema.rows.length} columns for Donations table`);
        } catch (e: any) {
            log(`❌ Error fetching schema: ${e.message}`);
        }

        // 3. Simulate Donation Insert (Test Save)
        try {
            log('Attempting Simulated Donation Insert...');
            // Minimal payload mimicking the frontend
            await query('BEGIN');
            const resInsert = await query(`
            INSERT INTO "Donations" (
                "GiftAmount", "GiftDate", "BatchID", "CreatedBy", "CreatedAt", "UpdatedAt", 
                "GiftType", "GiftMethod", "GiftPlatform", "TransactionType", "ClientID"
            ) VALUES (
                1.00, NOW(), NULL, 1, NOW(), NOW(), 
                'Individual', 'Check', 'Cage', 'Donation', 1
            ) RETURNING "DonationID"
        `);
            log(`✅ Insert Success! ID: ${resInsert.rows[0].DonationID}`);
            await query('ROLLBACK'); // Always rollback the test
            log('Rolled back test insert.');
        } catch (e: any) {
            insertError = e;
            log(`❌ INSERT FAILED: ${e.message}`);
            if (e.detail) log(`   Detail: ${e.detail}`);
            if (e.code) log(`   Code: ${e.code}`);
            try { await query('ROLLBACK'); } catch { }
        }

    } catch (err: any) {
        log(`🔥 FATAL: ${err.message}`);
    }

    return (
        <div className="p-8 font-mono max-w-6xl mx-auto bg-gray-50 text-xs">
            <h1 className="text-xl font-bold mb-4">God Mode Diagnostic</h1>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <h2 className="font-bold bg-blue-200 p-1">Logs</h2>
                    <pre className="bg-white border p-2 h-64 overflow-auto">
                        {logs.join('\n')}
                    </pre>

                    <h2 className="font-bold bg-red-200 p-1 mt-4">Insert Failures</h2>
                    <pre className="bg-white border p-2 text-red-600 font-bold whitespace-pre-wrap">
                        {insertError ? JSON.stringify(insertError, Object.getOwnPropertyNames(insertError), 2) : 'No Insert Errors'}
                    </pre>
                </div>

                <div>
                    <h2 className="font-bold bg-green-200 p-1">Users (Top 5)</h2>
                    <table className="w-full border-collapse border text-left">
                        <thead><tr className="bg-gray-100"><th>ID</th><th>User</th><th>Role</th></tr></thead>
                        <tbody>
                            {userDump.map((u, i) => <tr key={i} className="border-t"><td>{u.UserID}</td><td>{u.Username}</td><td>{u.Role}</td></tr>)}
                        </tbody>
                    </table>

                    <h2 className="font-bold bg-yellow-200 p-1 mt-4">Donations Schema</h2>
                    <div className="h-96 overflow-auto border bg-white">
                        <table className="w-full border-collapse border text-left">
                            <thead><tr className="bg-gray-100 sticky top-0"><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th></tr></thead>
                            <tbody>
                                {schemaDump.map((c, i) => (
                                    <tr key={i} className="border-t hover:bg-gray-100">
                                        <td className="font-semibold p-1">{c.column_name}</td>
                                        <td className="p-1">{c.data_type}</td>
                                        <td className="p-1">{c.is_nullable}</td>
                                        <td className="p-1 text-gray-500 truncate max-w-xs">{c.column_default}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
