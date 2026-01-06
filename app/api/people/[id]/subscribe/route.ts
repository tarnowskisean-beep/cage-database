
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const userId = session.user.id || (session.user as any).UserID; // Adjust based on actual session structure

    try {
        // Check if exists
        const check = await query(`
            SELECT "SubscriptionID" FROM "DonorSubscriptions" 
            WHERE "UserID" = $1 AND "DonorID" = $2
        `, [userId, id]);

        if (check.rows.length > 0) {
            // Unsubscribe
            await query(`
                DELETE FROM "DonorSubscriptions" 
                WHERE "UserID" = $1 AND "DonorID" = $2
            `, [userId, id]);
            return NextResponse.json({ subscribed: false });
        } else {
            // Subscribe
            await query(`
                INSERT INTO "DonorSubscriptions" ("UserID", "DonorID")
                VALUES ($1, $2)
            `, [userId, id]);
            return NextResponse.json({ subscribed: true });
        }

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
