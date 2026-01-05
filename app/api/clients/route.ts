import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        let queryText = 'SELECT "ClientID", "ClientCode", "ClientName", "LogoURL", "ClientType", "Status" FROM "Clients"';
        const params: any[] = [];

        // If ClientUser, filter by allowed IDs
        if (session?.user && (session.user as any).role === 'ClientUser') {
            const allowedIds = (session.user as any).allowedClientIds || [];
            if (allowedIds.length > 0) {
                queryText += ' WHERE "ClientID" = ANY($1)';
                params.push(allowedIds);
            } else {
                // If no clients assigned, return empty list
                return NextResponse.json([]);
            }
        }

        queryText += ' ORDER BY "ClientCode"';

        const result = await query(queryText, params);
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('GET /api/clients error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, name, logoUrl, clientType } = body;

        if (!code || !name) {
            return NextResponse.json({ error: 'Client Code and Name are required' }, { status: 400 });
        }

        // Check if code exists
        const existing = await query('SELECT "ClientID" FROM "Clients" WHERE "ClientCode" = $1', [code]);
        if (existing.rows.length > 0) {
            return NextResponse.json({ error: 'Client Code already exists' }, { status: 409 });
        }

        // Insert new client
        const result = await query(
            'INSERT INTO "Clients" ("ClientCode", "ClientName", "LogoURL", "ClientType") VALUES ($1, $2, $3, $4) RETURNING *',
            [code, name, logoUrl || null, clientType || null]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('POST /api/clients error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT handled in [id]/route.ts
