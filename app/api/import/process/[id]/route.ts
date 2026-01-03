import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { formatName, formatAddress, formatState, formatZip, formatEmail, formatPhone } from '@/lib/cleaners';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Helper: Normalize Keys (remove spaces, lowercase) for robust matching
const cleanKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const sessionId = params.id;

        // 1. Get Session Info
        const sessionRes = await query('SELECT * FROM "import_sessions" WHERE "id" = $1', [sessionId]);
        if (sessionRes.rows.length === 0) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        const importSession = sessionRes.rows[0];

        // 2. Get Mapping Rules (Source-specific + Global)
        const rulesRes = await query(`
            SELECT * FROM "mapping_rules" 
            WHERE ("source_system" = $1 OR "source_system" = '*') 
            AND "is_active" = true
            ORDER BY "priority" DESC
        `, [importSession.source_system]);
        const rules = rulesRes.rows;

        // 3. Get Staging Data
        const stagingRes = await query('SELECT "id", "source_row_data" FROM "staging_revenue" WHERE "session_id" = $1', [sessionId]);
        const stagingRows = stagingRes.rows;

        // 4. Process Each Row
        const updates: Promise<any>[] = [];

        for (const row of stagingRows) {
            const raw = row.source_row_data;
            const normalized: Record<string, any> = { ...raw }; // Start with raw data
            const defaultsApplied: string[] = [];
            const errors: string[] = [];

            // Helper to clean key for matching
            const helper = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');
            const rawKeys = Object.keys(raw);
            const keyMap: Record<string, string> = {}; // normalized key -> actual key
            rawKeys.forEach(k => keyMap[helper(k)] = k);

            // Apply Rules
            for (const rule of rules) {
                // 1. Column Mapping (Source -> Target)
                if (rule.source_column) {
                    // Match by exact or normalized source column
                    const sourceKey = keyMap[helper(rule.source_column)] || rule.source_column;
                    const sourceVal = raw[sourceKey];

                    if (sourceVal !== undefined && sourceVal !== null && sourceVal !== '') {
                        // Basic cleaning?
                        normalized[rule.target_column] = String(sourceVal).trim();
                    }
                }

                // 2. Defaults
                const existingVal = normalized[rule.target_column];
                if (existingVal === undefined || existingVal === null || existingVal === '') {
                    if (rule.default_value) {
                        normalized[rule.target_column] = rule.default_value;
                        defaultsApplied.push(`${rule.target_column}: ${rule.default_value} (Rule)`);
                    }
                }

                // 3. Transformations
                if (rule.transformation_rule === 'uppercase' && normalized[rule.target_column]) {
                    normalized[rule.target_column] = String(normalized[rule.target_column]).toUpperCase();
                }
                if (rule.transformation_rule === 'date_format' && normalized[rule.target_column]) {
                    try {
                        const d = new Date(normalized[rule.target_column]);
                        if (!isNaN(d.getTime())) {
                            normalized[rule.target_column] = d.toISOString().split('T')[0];
                        }
                    } catch (e) { /* ignore */ }
                }
            }

            // Hardcoded Logic: Derive Year/Quarter if missing
            if (!normalized['Gift Year'] && normalized['Gift Date']) {
                try {
                    const y = new Date(normalized['Gift Date']).getFullYear();
                    normalized['Gift Year'] = y;
                    defaultsApplied.push(`Gift Year: ${y} (Derived)`);
                } catch (e) { /* ignore */ }
            }

            // GLOBAL STANDARDIZATION
            if (normalized['First Name']) normalized['First Name'] = formatName(normalized['First Name']);
            if (normalized['Last Name']) normalized['Last Name'] = formatName(normalized['Last Name']);
            if (normalized['Address']) normalized['Address'] = formatAddress(normalized['Address']);
            if (normalized['City']) normalized['City'] = formatName(normalized['City']);
            if (normalized['State']) normalized['State'] = formatState(normalized['State']);
            if (normalized['Zip']) normalized['Zip'] = formatZip(normalized['Zip']);
            if (normalized['Email']) normalized['Email'] = formatEmail(normalized['Email']);
            if (normalized['Phone']) normalized['Phone'] = formatPhone(normalized['Phone']);
            if (normalized['Employer']) normalized['Employer'] = formatName(normalized['Employer']);
            if (normalized['Occupation']) normalized['Occupation'] = formatName(normalized['Occupation']);

            const updateSql = `
                UPDATE "staging_revenue" 
                SET "normalized_data" = $1, "defaults_applied" = $2, "validation_status" = $3 
                WHERE "id" = $4
            `;

            updates.push(query(updateSql, [
                JSON.stringify(normalized, null, 2),
                defaultsApplied,
                errors.length > 0 ? 'Invalid' : 'Valid',
                row.id
            ]));
        }

        await Promise.all(updates);

        // Update Session Status
        // Status 'Processing' indicates rules have been applied and it is waiting for Commit.
        await query('UPDATE "import_sessions" SET "status" = \'Processing\', "processed_count" = $1 WHERE "id" = $2', [
            stagingRows.length,
            sessionId
        ]);

        return NextResponse.json({ success: true, processed: stagingRows.length });

    } catch (error: any) {
        console.error('POST /api/import/process error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
