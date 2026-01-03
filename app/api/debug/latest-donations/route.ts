import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query(`
            SELECT "DonationID", "GiftAmount", "DonorFirstName", "DonorLastName", "DonorAddress", "OrganizationName", "CreatedAt"
            FROM "Donations"
            ORDER BY "CreatedAt" DESC
            LIMIT 20
        `);
        return NextResponse.json(result.rows);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
