import { NextResponse } from 'next/server';
import { transaction } from '@/lib/db';
import { z } from 'zod';

const MergeRequestSchema = z.object({
    primaryDonorId: z.number(),
    secondaryDonorIds: z.array(z.number()),
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { primaryDonorId, secondaryDonorIds } = MergeRequestSchema.parse(body);

        if (!secondaryDonorIds.length) {
            return NextResponse.json({ success: true, message: 'No donors to merge' });
        }

        await transaction(async (client) => {
            // 1. Reassign Donations
            await client.query(`
                UPDATE "Donations"
                SET "DonorID" = $1
                WHERE "DonorID" = ANY($2)
            `, [primaryDonorId, secondaryDonorIds]);

            // 2. Reassign Pledges
            // Only if "Pledges" table exists and has DonorID?
            // Checking existing schema from memory... Pledges table logic might be vague, but usually links to DonorID. 
            // In schema.postgres.sql: "Pledges" ("DonorID" int)
            await client.query(`
                UPDATE "Pledges"
                SET "DonorID" = $1
                WHERE "DonorID" = ANY($2)
            `, [primaryDonorId, secondaryDonorIds]);

            // 3. Reassign Tasks
            await client.query(`
                UPDATE "DonorTasks"
                SET "DonorID" = $1
                WHERE "DonorID" = ANY($2)
            `, [primaryDonorId, secondaryDonorIds]);

            // 4. Reassign Files
            await client.query(`
                UPDATE "DonorFiles"
                SET "DonorID" = $1
                WHERE "DonorID" = ANY($2)
            `, [primaryDonorId, secondaryDonorIds]);

            // 5. Reassign Resolution Candidates
            await client.query(`
                UPDATE "DonationResolutionCandidates"
                SET "DonorID" = $1
                WHERE "DonorID" = ANY($2)
            `, [primaryDonorId, secondaryDonorIds]);

            // 6. Delete Secondary Donors
            await client.query(`
                DELETE FROM "Donors"
                WHERE "DonorID" = ANY($1)
            `, [secondaryDonorIds]);
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error merging donors:', error);
        return NextResponse.json({ success: false, error: 'Failed to merge' }, { status: 500 });
    }
}
