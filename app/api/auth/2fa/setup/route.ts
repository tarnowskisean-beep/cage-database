import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from '@/lib/db';
import { authenticator } from 'otplib';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Generate Secret
    const secret = authenticator.generateSecret();
    const user = session.user.email || 'user';
    const service = 'CompassCPA';
    const otpauth = authenticator.keyuri(user, service, secret);

    return NextResponse.json({ secret, otpauth });
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { token, secret } = body;

    // Verify Token
    const isValid = authenticator.check(token, secret);
    if (!isValid) {
        return NextResponse.json({ error: 'Invalid Token' }, { status: 400 });
    }

    // Enable 2FA in DB
    try {
        await query(
            `UPDATE "Users" SET "TwoFactorSecret" = $1, "TwoFactorEnabled" = TRUE WHERE "UserID" = $2`,
            [secret, session.user.id] // Now types rely on the update above
        );
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
    }
}
