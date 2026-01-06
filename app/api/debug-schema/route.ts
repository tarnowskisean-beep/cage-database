
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const donations = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Donations'
        `);

        const donors = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'Donors'
        `);

        return NextResponse.json({
            donations: donations.rows,
            donors: donors.rows
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
