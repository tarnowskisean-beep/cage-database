import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DebugFull() {
    const logs: string[] = [];
    let schemaDump: any[] = [];
    let userDump: any[] = [];
    let insertError = null;

    const log = (msg: string) => logs.push(`[${new Date().toISOString().split('T')[1]}] ${msg}`);

    try {
        log('--- START DIAGNOSTIC (API MATCH V2) ---');

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

        // 3. Simulate Donation Insert (Test Save) - MATCHING API EXACTLY
        try {
            log('Attempting Simulated Donation Insert (Exact API Match)...');
            await query('BEGIN');
            const resInsert = await query(`
            INSERT INTO "Donations" 
            ("ClientID", "BatchID", "GiftAmount", "SecondaryID", "CheckNumber", "ScanString", 
             "TransactionType", "GiftMethod", "GiftPlatform", "GiftDate", "BatchDate",
             "GiftType", "GiftYear", "GiftQuarter", 
             "DonorEmail", "DonorPhone", "OrganizationName",
             "DonorPrefix", "DonorFirstName", "DonorMiddleName", "DonorLastName", "DonorSuffix",
             "DonorAddress", "DonorCity", "DonorState", "DonorZip",
             "DonorEmployer", "DonorOccupation",
             "GiftPledgeAmount", "GiftFee", "GiftCustodian", "GiftConduit",
             "ReceiptYear", "ReceiptQuarter", "IsInactive", "Comment",
             "CampaignID"
            )
            VALUES ($1, $2, $3, $4, $5, $6, 'Donation', $7, $8, NOW(), $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35)
            RETURNING "DonationID"`,
                [
                    1, // ClientID (Mock)
                    null, // BatchID
                    1.00, // GiftAmount
                    'TEST', // SecondaryID
                    '123', // CheckNumber
                    'SCAN123', // ScanString
                    'Check', // GiftMethod
                    'Cage', // GiftPlatform
                    new Date(), // BatchDate
                    'Individual', // GiftType
                    2024, // GiftYear
                    'Q1', // GiftQuarter
                    'test@example.com', // DonorEmail
                    '555-5555', // DonorPhone
                    'Test Org', // OP rgName
                    'Mr', 'John', 'D', 'Doe', 'Jr', // Prefix/Name...
                    '123 Main St', 'New York', 'NY', '10001', // Address...
                    'Acme Inc', 'Developer', // Employer/Occ
                    0, 0, 'Cust', 'Cond', // Pledge/Fee...
                    2024, 'Q1', false, 'Test Comment', // Postmark/Inactive...
                    'MAIL123' // MailCode
                ]
            );
            log(`✅ Insert Success! ID: ${resInsert.rows[0].DonationID}`);
            await query('ROLLBACK');
            log('Rolled back test insert.');
        } catch (e: any) {
            insertError = e;
            log(`❌ INSERT FAILED (API MATCH): ${e.message}`);
            if (e.detail) log(`   Detail: ${e.detail}`);
            if (e.hint) log(`   Hint: ${e.hint}`);
            try { await query('ROLLBACK'); } catch { }
        }

    } catch (err: any) {
        log(`🔥 FATAL: ${err.message}`);
    }

    return (
        <div className="p-8 font-mono max-w-6xl mx-auto bg-gray-50 text-xs">
            <h1 className="text-xl font-bold mb-4">God Mode Diagnostic</h1>


            {/* API Connectivity Test */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '2rem', border: '1px solid #3b82f6' }}>
                <h3 style={{ marginBottom: '1rem', color: '#3b82f6' }}>📡 API Connectivity Test (405 Debug)</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/test-post', { method: 'POST' });
                                const text = await res.text();
                                alert(`POST /api/test-post\nStatus: ${res.status}\nBody: ${text}`);
                            } catch (e: any) { alert('Fetch Failed: ' + e.message); }
                        }}
                        style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Test Global POST
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                // Test with batch 57 (or fallback to user input if needed, but 57 was in screenshot)
                                const id = '57';
                                const res = await fetch(`/api/batches/${id}/donations`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ amount: 1, test: true })
                                });
                                const text = await res.text();
                                alert(`POST /api/batches/${id}/donations\nStatus: ${res.status}\nBody: ${text.substring(0, 200)}`);
                            } catch (e: any) { alert('Fetch Failed: ' + e.message); }
                        }}
                        style={{ padding: '0.5rem 1rem', background: '#ec4899', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Test Batches POST
                    </button>
                    <button
                        onClick={async () => {
                            try {
                                const res = await fetch('/api/batches/57/donations', { method: 'OPTIONS' });
                                alert(`OPTIONS /api/batches/57/donations\nStatus: ${res.status}`);
                            } catch (e: any) { alert('Fetch Failed: ' + e.message); }
                        }}
                        style={{ padding: '0.5rem 1rem', background: '#8b5cf6', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Test OPTIONS
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
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
        </div>

    );
}
