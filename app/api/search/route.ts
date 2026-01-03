import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Types for our Query Builder
type Operator = 'AND' | 'OR';
type RuleOperator = 'equals' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq';

interface SearchRule {
    field: string;
    operator: RuleOperator;
    value: string | number | boolean | null;
}

interface SearchGroup {
    combinator: Operator;
    rules: (SearchRule | SearchGroup)[];
}

// Map frontend fields to DB columns
const FIELD_MAP: Record<string, string> = {
    // Donation Fields
    'amount': 'd."GiftAmount"',
    'date': 'd."GiftDate"',
    'method': 'd."GiftMethod"',
    'checkNumber': 'd."SecondaryID"',

    // Donor Fields
    'donorName': 'd."DonorLastName"', // Simplified for now, really should search first/last
    'donorCity': 'd."DonorCity"',
    'donorState': 'd."DonorState"',
    'donorZip': 'd."DonorZip"',

    // Related Fields
    'clientCode': 'c."ClientCode"',
    'batchCode': 'b."BatchCode"'
};

function buildWhereClause(group: SearchGroup, params: (string | number | boolean | null)[]): string {
    if (!group.rules || group.rules.length === 0) return '1=1';

    const conditions = group.rules.map(rule => {
        if ('combinator' in rule) {
            // Nested Group
            return `(${buildWhereClause(rule as SearchGroup, params)})`;
        } else {
            // Rule
            const r = rule as SearchRule;
            const dbField = FIELD_MAP[r.field];

            if (!dbField) return '1=1'; // Ignore unknown fields

            const paramIndex = params.length + 1;

            switch (r.operator) {
                case 'equals':
                    params.push(r.value);
                    return `${dbField} = $${paramIndex}`;
                case 'neq':
                    params.push(r.value);
                    return `${dbField} != $${paramIndex}`;
                case 'contains':
                    params.push(`%${r.value}%`);
                    return `${dbField} ILIKE $${paramIndex}`;
                case 'gt':
                    params.push(r.value);
                    return `${dbField} > $${paramIndex}`;
                case 'lt':
                    params.push(r.value);
                    return `${dbField} < $${paramIndex}`;
                case 'gte':
                    params.push(r.value);
                    return `${dbField} >= $${paramIndex}`;
                case 'lte':
                    params.push(r.value);
                    return `${dbField} <= $${paramIndex}`;
                default:
                    return '1=1';
            }
        }
    });

    return conditions.join(` ${group.combinator} `);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const searchGroup = body as SearchGroup;

        const params: (string | number | boolean | null)[] = [];
        const whereClause = buildWhereClause(searchGroup, params);

        // Safety limit 100
        const sql = `
            SELECT 
                d.*,
                b."BatchCode",
                c."ClientCode", c."ClientName"
            FROM "Donations" d
            JOIN "Batches" b ON d."BatchID" = b."BatchID"
            JOIN "Clients" c ON d."ClientID" = c."ClientID"
            WHERE ${whereClause}
            ORDER BY d."GiftDate" DESC
            LIMIT 100
        `;

        console.log('Search SQL:', sql);
        console.log('Params:', params);

        const result = await query(sql, params);

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Search API Error:', error);
        return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
}
