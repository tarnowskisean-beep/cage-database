
import { query, transaction } from '../lib/db';

async function migrateBatchCodes() {
    console.log('Starting Batch Code Migration...');

    try {
        // Fetch all batches with necessary details
        // Order by CreatedAt ASC to determine sequence correctly
        const result = await query(`
            SELECT 
                b."BatchID", b."Date", b."CreatedBy", b."DefaultGiftPlatform", b."ImportSessionID", b."CreatedAt",
                c."ClientCode",
                u."Username", u."Email"
            FROM "Batches" b
            JOIN "Clients" c ON b."ClientID" = c."ClientID"
            LEFT JOIN "Users" u ON b."CreatedBy" = u."UserID"
            ORDER BY b."CreatedAt" ASC
        `);

        console.log(`Found ${result.rows.length} batches to process.`);

        const updates: { BatchID: number; BatchCode: string }[] = [];
        // Track sequences: Key = "UserID_Date" -> Value = count
        const sequenceTracker: Record<string, number> = {};

        const abbreviations: Record<string, string> = {
            'Chainbridge': 'CB', 'Stripe': 'ST', 'National Capital': 'NC', 'City National': 'CN',
            'Propay': 'PP', 'Anedot': 'AN', 'Winred': 'WR', 'Cage': 'CG', 'Import': 'IM',
            'Check': 'CK', 'Wire': 'WI', 'Cash': 'CS', 'Credit Card': 'CC'
        };

        for (const batch of result.rows) {
            // 1. Determine Date String (YYYY.MM.DD)
            const dateObj = new Date(batch.Date);
            const yyyy = dateObj.getFullYear();
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}.${mm}.${dd}`;

            // 2. Determine User Initials
            let initials = 'XX';
            if (batch.Username) {
                // Try from Username first (e.g. "Sean Tarnowski")
                initials = batch.Username.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
            } else if (batch.ImportSessionID) {
                // If import and no user associated directly (legacy?), assume import system
                // But query uses LEFT JOIN on CreatedBy. If CreatedBy is the Source System string (legacy), u.Username is null.
                // In Import logic: CreatedBy = source_system (string).
                // Let's check if CreatedBy is a number or string in DB?
                // The schema says CreatedBy is INT usually joined to Users. 
                // BUT the Import Logic inserts `importSession.source_system` into `CreatedBy`.
                // Wait, `CreatedBy` column type?
                // If it's INT, then `importSession.source_system` (string) would fail unless it's an ID.
                // Let's assume for now existing data might be messy.
                // If CreatedBy is NULL or not a User: Use "IM" or parse source system?
                // Actually, the Import logic puts `importSession.source_system` into `CreatedBy`. 
                // Postgres integer column would reject "Winred".
                // I suspect `CreatedBy` is VARCHAR or TEXT? 
                // Checking previous files... `app/api/import/commit/[id]/route.ts`:
                // `VALUES (..., $3, ...)` where $3 is `importSession.source_system`.
                // If `CreatedBy` is INT reference to Users, this would FAIL.
                // Unless `source_system` is stored differently?
                // User's schema is likely loose or CreatedBy is text. 
                // Let's treat it as safe text since the query worked.
            }

            // Re-eval CreatedBy: in GET /api/batches, it joins "Users" u ON b."CreatedBy" = u."UserID".
            // This implies CreatedBy is compatible with UserID (INT or UUID).
            // But import route pushes a string? 
            // Ah, import route: 
            // `const batchRes = await client.query(..., [..., importSession.source_system, ...])`
            // If DB schema is Strict Int, this crashes. User code might be mixed.
            // Let's handle the initials safely:

            if (initials === 'XX' && batch.CreatedBy) {
                // If it's a string like "Winred"
                if (typeof batch.CreatedBy === 'string') {
                    initials = batch.CreatedBy.substring(0, 2).toUpperCase();
                }
            }

            // Track Sequence per User+Date
            const userKey = `${initials}_${dateStr}`;
            const seq = (sequenceTracker[userKey] || 0) + 1;
            sequenceTracker[userKey] = seq;
            const seqStr = String(seq).padStart(2, '0');

            // 3. Platform Code
            // If DefaultGiftPlatform is null, try to infer?
            const platform = batch.DefaultGiftPlatform || 'Manual';
            let platformCode = abbreviations[platform];
            if (!platformCode) {
                platformCode = platform.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 2);
            }

            // 4. Construct Code
            // Format: [Client].[Platform].[Date].[Initials].[Seq]
            const newCode = `${batch.ClientCode}.${platformCode}.${dateStr}.${initials}.${seqStr}`;

            updates.push({
                BatchID: batch.BatchID,
                BatchCode: newCode
            });
        }

        console.log(`Prepared ${updates.length} updates.`);

        // execute updates
        // To be safe and fast, use individual updates (or bulk if massive, but 20k is fine for loop)
        // actually transaction is better
        await transaction(async (client) => {
            for (const up of updates) {
                await client.query('UPDATE "Batches" SET "BatchCode" = $1 WHERE "BatchID" = $2', [up.BatchCode, up.BatchID]);
            }
        });

        console.log('Migration Complete.');

    } catch (e) {
        console.error('Migration Failed:', e);
    }
}

migrateBatchCodes();
