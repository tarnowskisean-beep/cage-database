
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { formatName, formatState, formatZip } from '@/lib/cleaners';

// Self-contained Verification Script
export async function GET() {
    try {
        console.log('[Verify] Starting Import System Test...');

        // 1. SETUP: Create Test Mappings
        const sourceSystem = 'TestSystem_v1';

        // Clean up old test data
        await query('DELETE FROM "mapping_rules" WHERE "source_system" = $1', [sourceSystem]);
        await query('DELETE FROM "import_sessions" WHERE "source_system" = $1', [sourceSystem]);

        // Insert Rules
        // Map 'fname' -> 'First Name'
        // Map 'lname' -> 'Last Name'
        // Map 'amt'   -> 'Gift Amount'
        // Default 'Gift Platform' -> 'Import'
        await query(`
            INSERT INTO "mapping_rules" ("source_system", "source_column", "target_column", "default_value", "is_active")
            VALUES 
            ($1, 'fname', 'First Name', null, true),
            ($1, 'lname', 'Last Name', null, true),
            ($1, 'amt', 'Gift Amount', null, true),
            ($1, 'st', 'State', null, true),
            ($1, null, 'Gift Platform', 'Import', true),
            ($1, null, 'Gift Date', '2025-01-01', true) -- Hardcode date for test
        `, [sourceSystem]);

        // 2. SETUP: Create Import Session
        const sessionRes = await query(`
            INSERT INTO "import_sessions" ("filename", "source_system", "status", "created_by")
            VALUES ($1, $2, 'Uploaded', 1) -- assuming UserID 1 exists (agraham or starnowski)
            RETURNING "id"
        `, ['test_import.csv', sourceSystem]);
        const sessionId = sessionRes.rows[0].id;

        // 3. SETUP: Insert Raw Staging Data
        const rawData1 = { fname: 'john', lname: 'doe', amt: '50.00', st: 'california' }; // Needs cleaning
        const rawData2 = { fname: 'JANE', lname: 'SMITH', amt: '100', st: 'NY' };

        await query(`
            INSERT INTO "staging_revenue" ("session_id", "source_row_data", "row_number")
            VALUES 
            ($1, $2, 1),
            ($1, $3, 2)
        `, [sessionId, JSON.stringify(rawData1), JSON.stringify(rawData2)]);

        // 4. EXECUTE PROCESS LOGIC (Simulating the API logic)
        // Fetch Rules
        const rulesRes = await query(`SELECT * FROM "mapping_rules" WHERE "source_system" = $1`, [sourceSystem]);
        const rules = rulesRes.rows;

        // Fetch Staging
        const stagingRes = await query('SELECT "id", "source_row_data" FROM "staging_revenue" WHERE "session_id" = $1', [sessionId]);

        const results = [];

        for (const row of stagingRes.rows) {
            const raw = row.source_row_data;
            const normalized: any = { ...raw };

            // Apply Rules
            for (const rule of rules) {
                if (rule.source_column && raw[rule.source_column]) {
                    normalized[rule.target_column] = raw[rule.source_column];
                }
                if (rule.default_value && !normalized[rule.target_column]) {
                    normalized[rule.target_column] = rule.default_value;
                }
            }

            // Cleaners
            if (normalized['First Name']) normalized['First Name'] = formatName(normalized['First Name']);
            if (normalized['Last Name']) normalized['Last Name'] = formatName(normalized['Last Name']);
            if (normalized['State']) normalized['State'] = formatState(normalized['State']);

            // Update DB
            await query(`
                UPDATE "staging_revenue" 
                SET "normalized_data" = $1, "validation_status" = 'Valid'
                WHERE "id" = $2
            `, [JSON.stringify(normalized), row.id]);

            results.push({
                raw,
                normalized
            });
        }

        return NextResponse.json({
            success: true,
            sessionId,
            message: 'Import Test Completed Successfully',
            mappingsCreated: rules.length,
            rowsProcessed: results
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
