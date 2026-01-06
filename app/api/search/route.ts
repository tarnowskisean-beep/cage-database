import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
    'platform': 'd."GiftPlatform"',
    'checkNumber': 'd."SecondaryID"',

    // Donor Fields
    'donorName': 'd."DonorLastName"', // Simplified for now
    'donorFirstName': 'd."DonorFirstName"',
    'donorCity': 'd."DonorCity"',
    'donorState': 'd."DonorState"',
    'donorZip': 'd."DonorZip"',
    'donorEmail': 'd."DonorEmail"',
    'donorEmployer': 'd."DonorEmployer"',
    'donorOccupation': 'd."DonorOccupation"',
    'orgName': 'd."OrganizationName"',
    'comment': 'd."Comment"',

    // Related Fields
    'clientCode': 'c."ClientCode"',
    'batchCode': 'b."BatchCode"',
    'compositeId': 'd."ScanString"',
    'accountId': 'd."AccountID"'
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
        // Extract limit if present, default to 1000 for general use, but Search UI might want smaller?
        // Let's default to 100 IF not specified to match previous behavior vs UI performance, 
        // OR better yet, let's bump default to 500. 100 is too small for a "page".
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { limit = 100, ...searchGroupData } = body;
        const searchGroup = searchGroupData as SearchGroup;

        const params: any[] = [];
        let whereClause = buildWhereClause(searchGroup, params);

        // Enforce Client Access Control
        if (session.user.role === 'ClientUser') {
            if (!session.user.allowedClientIds || session.user.allowedClientIds.length === 0) {
                return NextResponse.json({ error: 'Client User has no assigned Clients' }, { status: 403 });
            }
            // Add AND condition to existing whereClause
            const paramIndex = params.length + 1;
            params.push(session.user.allowedClientIds);
            whereClause = `(${whereClause}) AND d."ClientID" = ANY($${paramIndex})`;
        }

        // Use the requested limit or default
        const limitClause = limit === 'all' ? '' : `LIMIT ${Number(limit) || 100}`;

        const sql = `
            SELECT 
                d.*,
                d."ScanString",
                b."BatchCode",
                c."ClientCode", c."ClientName"
            FROM "Donations" d
            JOIN "Batches" b ON d."BatchID" = b."BatchID"
            JOIN "Clients" c ON d."ClientID" = c."ClientID"
            WHERE ${whereClause} AND b."Status" IN ('Closed', 'Reconciled')
            ORDER BY d."GiftDate" DESC
            ${limitClause}
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
