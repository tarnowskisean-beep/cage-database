
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const diagnostic: any = {
        timestamp: new Date().toISOString(),
        env: {
            hasDatabaseUrl: !!process.env.DATABASE_URL,
            // Don't leak full string, but check protocol
            dbProtocol: process.env.DATABASE_URL?.split(':')[0],
            nodeEnv: process.env.NODE_ENV,
        }
    };

    try {
        const start = Date.now();
        const clientRes = await query('SELECT COUNT(*) as count FROM "Clients"');
        diagnostic.database = {
            status: 'Connected',
            latencyMs: Date.now() - start,
            clientCount: clientRes.rows[0].count,
        };
    } catch (dbError: any) {
        diagnostic.database = {
            status: 'Error',
            message: dbError.message,
            code: dbError.code
        };
    }

    try {
        const session = await getServerSession(authOptions);
        diagnostic.session = session || 'No Session';
    } catch (authError: any) {
        diagnostic.session = { error: authError.message };
    }

    return NextResponse.json(diagnostic, { status: 200 });
}
