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

            // Apply Rules
            for (const rule of rules) {
                // 1. Column Mapping (Source -> Target)
                if (rule.source_column) {
                    // Try to find the source column in raw data (case-insensitive fuzzy match could be added later)
                    // For now, exact match or simple clean
                    const sourceVal = raw[rule.source_column];
                    if (sourceVal !== undefined && sourceVal !== null && sourceVal !== '') {
                        normalized[rule.target_column] = sourceVal;
                    }
                }

                // 2. Defaults
                // Check if target column has a value (either from mapping above or raw data)
                const existingVal = normalized[rule.target_column];

                // If empty or null, apply default
                if (existingVal === undefined || existingVal === null || existingVal === '') {
                    if (rule.default_value) {
                        normalized[rule.target_column] = rule.default_value;
                        defaultsApplied.push(`${rule.target_column}: ${rule.default_value} (Rule)`);
                    }
                }

                // Apply Transformations (e.g. UPPERCASE)
                if (rule.transformation_rule === 'uppercase' && normalized[rule.target_column]) {
                    normalized[rule.target_column] = String(normalized[rule.target_column]).toUpperCase();
                }
                if (rule.transformation_rule === 'date_format' && normalized[rule.target_column]) {
                    // Basic attempt to normalize dates
                    try {
                        const d = new Date(normalized[rule.target_column]);
                        if (!isNaN(d.getTime())) {
                            normalized[rule.target_column] = d.toISOString().split('T')[0];
                        }
                    } catch (e) { }
                }
            }

            // Hardcoded Logic: Derive Year/Quarter if missing
            if (!normalized['Gift Year'] && normalized['Gift Date']) {
                try {
                    const y = new Date(normalized['Gift Date']).getFullYear();
                    normalized['Gift Year'] = y;
                    defaultsApplied.push(`Gift Year: ${y} (Derived)`);
                } catch (e) { }
            }

            const updateSql = `
                UPDATE "staging_revenue" 
                SET "normalized_data" = $1, "defaults_applied" = $2, "validation_status" = $3 
                WHERE "id" = $4
            `;

            // Batch the promises (in real prod, use pg-promise or similar for massive batches)
        } else if (rule.default_value) {
            normalized[rule.target_column] = rule.default_value;
            defaultsApplied.push(`${rule.target_column}=${rule.default_value}`);
        }
    });

    // GLOBAL STANDARDIZATION
    // Applied after mapping rules to ensure consistent formatting regardless of source
    if (normalized['First Name']) normalized['First Name'] = formatName(normalized['First Name']);
    if (normalized['Last Name']) normalized['Last Name'] = formatName(normalized['Last Name']);
    if (normalized['Address']) normalized['Address'] = formatAddress(normalized['Address']);
    if (normalized['City']) normalized['City'] = formatName(normalized['City']);
    if (normalized['State']) normalized['State'] = formatState(normalized['State']);
    if (normalized['Zip']) normalized['Zip'] = formatZip(normalized['Zip']);

    const updateSql = `
                        UPDATE "staging_revenue"
                        SET "normalized_data" = $1,
                            "defaults_applied" = $2,
                            "validation_status" = $3
                        WHERE "id" = $4
                    `;

    updates.push(query(updateSql, [
        JSON.stringify(normalized, null, 2), // Pretty print for easier debugging/viewing
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
