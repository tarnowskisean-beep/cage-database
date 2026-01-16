import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { z } from 'zod';

// Minimal output schema
const DuplicateResultSchema = z.object({
    field: z.string(),
    value: z.string(),
    count: z.number(),
    donorIds: z.array(z.number()),
});

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const results = [];

        // 1. Scan for Duplicate Emails
        // Ignore empty emails
        const emailQuery = `
            SELECT "Email", COUNT(*) as cnt, array_agg("DonorID") as ids
            FROM "Donors"
            WHERE "Email" IS NOT NULL AND "Email" <> ''
            GROUP BY "Email"
            HAVING COUNT(*) > 1
        `;
        const emailRes = await query(emailQuery);

        // Fetch details for all involved donors to avoid N+1 in UI
        const allDonorIds = new Set<number>();
        emailRes.rows.forEach((r: any) => r.ids.forEach((id: number) => allDonorIds.add(id)));

        const nameQuery = `
            SELECT "FirstName", "LastName", COUNT(*) as cnt, array_agg("DonorID") as ids
            FROM "Donors"
            WHERE "FirstName" IS NOT NULL AND "FirstName" <> ''
              AND "LastName" IS NOT NULL AND "LastName" <> ''
            GROUP BY "FirstName", "LastName"
            HAVING COUNT(*) > 1
        `;
        const nameRes = await query(nameQuery);
        nameRes.rows.forEach((r: any) => r.ids.forEach((id: number) => allDonorIds.add(id)));

        // Bulk fetch donor details
        let donorMap: Record<number, any> = {};
        if (allDonorIds.size > 0) {
            const donorDetailsRes = await query(`
                SELECT * FROM "Donors" WHERE "DonorID" = ANY($1)
            `, [Array.from(allDonorIds)]);
            donorMap = donorDetailsRes.rows.reduce((acc: any, d: any) => {
                acc[d.DonorID] = d;
                return acc;
            }, {});
        }

        for (const row of emailRes.rows) {
            results.push({
                field: 'Email',
                value: row.Email,
                count: parseInt(row.cnt),
                donors: row.ids.map((id: number) => donorMap[id]).filter(Boolean)
            });
        }

        for (const row of nameRes.rows) {
            results.push({
                field: 'Name',
                value: `${row.FirstName} ${row.LastName}`,
                count: parseInt(row.cnt),
                donors: row.ids.map((id: number) => donorMap[id]).filter(Boolean)
            });
        }

        // 3. Scan for Duplicate Address (Rough)
        // Optional for now...

        return NextResponse.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Error scanning for duplicates:', error);
        return NextResponse.json({ success: false, error: 'Failed to scan' }, { status: 500 });
    }
}
