
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { firstName, lastName, email, address, limit = 5 } = body;

        // Validation: Need at least a name or email
        if ((!firstName && !lastName) && !email) {
            return NextResponse.json({ matches: [] });
        }

        // Fuzzy Logic
        // 1. Precise Match on Email
        // 2. Exact Match on Name
        // 3. Fuzzy Match on Name (Levenshtein or just ILIKE)

        // Postgres ILIKE is simple and fast enough for modest DBs.
        // Trigram indexes would be better for true fuzzy, but let's stick to ILIKE for now.

        const sql = `
            SELECT 
                "DonorID", "DonorFirstName", "DonorLastName", "DonorEmail", "DonorAddress", "ClientCode",
                (
                    CASE 
                        WHEN "DonorEmail" ILIKE $1 THEN 1.0
                        WHEN "DonorFirstName" ILIKE $2 AND "DonorLastName" ILIKE $3 THEN 0.9
                        WHEN "DonorLastName" ILIKE $3 AND "DonorAddress" ILIKE $4 THEN 0.8
                        ELSE 0.5
                    END
                ) as confidence
            FROM "Donors"
            WHERE 
                ($1::text IS NOT NULL AND "DonorEmail" ILIKE $1)
                OR
                ($2::text IS NOT NULL AND $3::text IS NOT NULL AND "DonorFirstName" ILIKE $2 AND "DonorLastName" ILIKE $3)
                OR
                ($3::text IS NOT NULL AND "DonorLastName" ILIKE $3 AND $4::text IS NOT NULL AND "DonorAddress" ILIKE $4)
            ORDER BY confidence DESC
            LIMIT $5
        `;

        const params = [
            email || null,
            firstName ? `${firstName}%` : null, // Prefix match OK?
            lastName || null,
            address ? `%${address.split(' ')[0]}%` : null, // Match first part of address '123'
            limit
        ];

        const res = await query(sql, params);

        return NextResponse.json({ matches: res.rows });

    } catch (e: any) {
        console.error('Duplicate lookup failed', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
