import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

export async function POST() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userId = (session.user as any).id;
        const email = (session.user as any).email || 'user@compass.cpa';

        // Generate Secret
        const secret = authenticator.generateSecret();

        // Generate OTPauth URL
        const otpauth = authenticator.keyuri(email, 'Compass', secret);

        // Generate QR Code
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        // Save secret temporarily (or permanently but disabled)
        // Ideally we verify it first, but for MVP we can save it now.
        // Better flow: Save secret to DB now. Set TwoFactorEnabled = false.
        await query('UPDATE "Users" SET "TwoFactorSecret" = $1, "TwoFactorEnabled" = false WHERE "UserID" = $2', [secret, userId]);

        return NextResponse.json({ secret, qrCodeUrl });
    } catch (error) {
        console.error('2FA Setup Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
