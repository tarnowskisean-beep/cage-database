
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "../[...nextauth]/route";
import { query } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// GET: Check if user needs to accept policies
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ needsAcceptance: false }); // Or 401

    try {
        // Find active policies that the user has NOT accepted
        // or where the accepted version is older than current
        const userId = session.user.id;

        const res = await query(`
            SELECT p.*
            FROM "Policies" p
            LEFT JOIN "PolicyAcceptances" pa ON p."PolicyID" = pa."PolicyID" AND pa."UserID" = $1
            WHERE p."IsActive" = TRUE
            AND (pa."AcceptanceID" IS NULL) -- Simply check if accepted at all for now. Ideally check version match too.
        `, [userId]);

        if (res.rows.length > 0) {
            return NextResponse.json({
                needsAcceptance: true,
                policies: res.rows
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
            parseInt(userId),
            'AcceptPolicy',
            null,
            `Accepted Policies: ${policyIds.join(',')}`
        );

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
