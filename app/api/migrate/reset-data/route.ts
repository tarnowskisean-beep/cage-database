import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Hard Reset Logic
        // Clear transaction tables in correct order (FK constraints)
        await query('TRUNCATE TABLE "Donations" CASCADE');
        await query('TRUNCATE TABLE "BatchDocuments" CASCADE');
        await query('TRUNCATE TABLE "Batches" CASCADE');

        // Optional: Clear Prospects? User said "current data", usually means transactions.
        // Let's stick to transactions first.

        return NextResponse.json({ success: true, message: 'All transaction data cleared.' });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
