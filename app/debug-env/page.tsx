import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DebugEnv() {
    let dbStatus = 'Unknown';
    let schemaHealth = 'Unknown';
    let userList = 'None';
    let userCount = 0;

    try {
        const res = await query('SELECT NOW()');
        dbStatus = 'Connected: ' + res.rows[0].now;

        // Check Donations Columns
        const requiredCols = [
            'MailCode', 'DonorPrefix', 'DonorFirstName', 'GiftType', 'OrganizationName', 'StartLine', 'Version'
        ];
        const missing: string[] = [];

        // We can't easily query information_schema if permissions are weird, 
        // but we can try selecting them with LIMIT 0
        for (const col of requiredCols) {
            try {
                await query(`SELECT "${col}" FROM "Donations" LIMIT 0`);
            } catch (e: any) {
                missing.push(col);
            }
        }

        if (missing.length === 0) {
            schemaHealth = '✅ Healthy (All key columns present)';
        } else {
            schemaHealth = '❌ CRITICAL: Missing columns: ' + missing.join(', ');
        }

        // CHECK USERS
        try {
            const userCheck = await query('SELECT "Username", "Role", "IsActive" FROM "Users"');
            userCount = userCheck.rows.length;
            userList = userCheck.rows.map((u: any) => `${u.Username} (${u.Role}, ${u.IsActive ? 'Active' : 'Inactive'})`).join(', ');
        } catch (uErr: any) {
            userList = 'Error fetching users: ' + uErr.message;
        }

    } catch (err: any) {
        dbStatus = 'Error: ' + err.message;
    }

    return (
        <div className="p-8 font-mono">
            <h1>Debug Environment</h1>
            <p>DB Status: {dbStatus}</p>
            <p>Schema Health: {schemaHealth}</p>
            <p>Users Found ({userCount}): {userList}</p>
            {schemaHealth.includes('❌') && (
                <p className="text-red-500 font-bold mt-4">
                    ACTION REQUIRED: Visit <a href="/api/migrate/soc2" className="underline">/api/migrate/soc2</a> to fix.
                </p>
            )}
        </div>
    );
}
