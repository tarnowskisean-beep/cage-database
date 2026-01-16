
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

import { getPendingPolicies } from '@/lib/policy';

// GET: Check if user needs to accept policies
export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ needsAcceptance: false }); // Or 401

    try {
        const userId = session.user.id;
        const policies = await getPendingPolicies(userId);

        if (policies.length > 0) {
            return NextResponse.json({
                needsAcceptance: true,
                policies: policies
            });
        }

        return NextResponse.json({ needsAcceptance: false });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// POST: Accept a policy
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const { policyIds } = await req.json();
        const userId = session.user.id;
        const tasks = [];

        // Simple validation
        if (!Array.isArray(policyIds)) throw new Error("Invalid payload");

        console.log(`[PolicyAcceptance] Processing for UserID: ${userId} (${typeof userId}), Policies: ${JSON.stringify(policyIds)}`);

        for (const pid of policyIds) {
            tasks.push(query(`
                INSERT INTO "PolicyAcceptances" ("UserID", "PolicyID", "IPAddress")
                VALUES ($1, $2, '0.0.0.0') -- Ideally get real IP from headers
                ON CONFLICT ("UserID", "PolicyID") 
                DO UPDATE SET "AcceptedAt" = NOW()
            `, [userId, pid]));
        }

        await Promise.all(tasks);

        await logAudit(
            'AcceptPolicy',
            'USER_POLICY',
            String(userId),
            `User ${userId} accepted policies: ${policyIds.join(', ')}`,
            String(userId)
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('[PolicyAcceptance] Error:', e);
        return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
    }
}
