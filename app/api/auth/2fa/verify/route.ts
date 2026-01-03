import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../[...nextauth]/route';
import { query } from '@/lib/db';
import { authenticator } from 'otplib';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { token } = await request.json();
        const userId = (session.user as any).id;

        // Get Secret
        const res = await query('SELECT "TwoFactorSecret" FROM "Users" WHERE "UserID" = $1', [userId]);
        if (res.rows.length === 0) return NextResponse.json({ error: 'User not found' }, { status: 404 });

        const secret = res.rows[0].TwoFactorSecret;
        if (!secret) return NextResponse.json({ error: '2FA setup not initiated' }, { status: 400 });

        // Verify Token
        const isValid = authenticator.check(token, secret);

        if (isValid) {
            // Enable 2FA
            await query('UPDATE "Users" SET "TwoFactorEnabled" = true WHERE "UserID" = $1', [userId]);
            return NextResponse.json({ message: '2FA Enabled Successfully' });
        } else {
            return NextResponse.json({ error: 'Invalid Code' }, { status: 400 });
        }
    } catch (error) {
        console.error('2FA Verify Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
