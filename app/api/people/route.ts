
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const minParam = searchParams.get('min');
    const cityParam = searchParams.get('city');
    const clientIdParam = searchParams.get('clientId');

    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    try {
        let sql = `
            SELECT 
                d."DonorID", d."FirstName", d."LastName", d."Email", d."Phone", d."City", d."State",
                COUNT(don."DonationID") as "TotalGifts",
                COALESCE(SUM(don."GiftAmount"), 0) as "LifetimeValue",
                MAX(don."GiftDate") as "LastGiftDate"
            FROM "Donors" d
            LEFT JOIN "Donations" don ON d."DonorID" = don."DonorID"
            WHERE 1=1
        `;
        const params: any[] = [];
        let paramIdx = 1;

        // --- Security & Filtering ---
        if ((session.user as any).role === 'ClientUser') {
            const allowedIds: number[] = (session.user as any).allowedClientIds || [];

            if (allowedIds.length === 0) {
                return NextResponse.json({ data: [], page, hasMore: false }); // No access
            }

            if (clientIdParam) {
                // User wants a specific client, verify access
                const requestedId = parseInt(clientIdParam);
                if (!allowedIds.includes(requestedId)) {
                    return NextResponse.json({ error: 'Unauthorized access to client' }, { status: 403 });
                }
                params.push(requestedId);
                sql += ` AND don."ClientID" = $${paramIdx}`;
                paramIdx++;
            } else {
                // User wants all "their" clients
                // We must filter donations to ONLY their allowed clients
                params.push(allowedIds);
                sql += ` AND don."ClientID" = ANY($${paramIdx})`;
                paramIdx++;
            }
        } else {
            // Admin/Clerk
            if (clientIdParam) {
                params.push(parseInt(clientIdParam));
                sql += ` AND don."ClientID" = $${paramIdx}`;
                paramIdx++;
            }
        }
        // -----------------------------

        if (q) {
            params.push(`%${q}%`);
            sql += ` AND (d."FirstName" ILIKE $${paramIdx} OR d."LastName" ILIKE $${paramIdx} OR d."Email" ILIKE $${paramIdx})`;
            paramIdx++;
        }

        if (cityParam) {
            params.push(`%${cityParam}%`);
            sql += ` AND d."City" ILIKE $${paramIdx}`;
            paramIdx++;
        }

        sql += ` GROUP BY d."DonorID"`;

        if (minParam) {
            params.push(parseFloat(minParam));
            sql += ` HAVING COALESCE(SUM(don."GiftAmount"), 0) >= $${paramIdx}`;
            paramIdx++;
        }

        const campaignParam = searchParams.get('campaign');
        if (campaignParam) {
            params.push(campaignParam);
            // We need to filter the SUM/COUNT based on the campaign, or just filter the donors who HAVE given to this campaign?
            // "Filter a group of donors who give to X campaign and give over $300 [to that campaign? or total?]"
            // Usually simpler to filter donors who have at least one gift to X, and THEN check totals. 
            // BUT if we want "gave > $300 TO campaign X", we need to filter the JOIN or the WHERE inside aggregate.
            // Let's assume filter the donors where ANY donation matches, and the totals reflect THAT match or Global?
            // The prompt says "give to X campaign AND give over $300". This implies the $300 is aggregate.
            // Let's filter the LEFT JOIN to only include relevant donations if campaign is selected?
            // No, that would mess up "Lifetime Value" if we want their TOTAL value but only if they gave to X.
            // PROBABLY: Users expect "Show me everyone who gave to X", and "Total Giving" usually means Total.
            // BUT "Give > $300" in this context likely means "Give > $300 TO THIS CAMPAIGN".
            // Let's try to filter the JOIN. Then LTV = LTV *for that campaign*.
            // This is usually what segmentation means.
        }

        // RE-WRITING QUERY CONSTRUCTION TO HANDLE FILTERS IN JOIN
        // If we want LTV to be "Total Giving *Matching Filters*", we put filters in the ON or WHERE of the JOIN/Subquery.
        // Current query: LEFT JOIN "Donations" don ON d."DonorID" = don."DonorID" WHERE ...
        // If we add `AND don."MailCode" = $Campaign` to WHERE, it filters Rows. Inner Join-like behavior for Aggregates.
        // If a donor didn't give to campaign, they vanish (TotalGifts=0, LTV=null -> likely filtered out if we use Inner Join or Having > 0).

        // Let's stick to the current structure but add the condition to WHERE. 
        // Since it's a LEFT JOIN, adding a WHERE clause on the right table turns it into an INNER JOIN effectively 
        // (unless we allow NULLs, but we want to filter by specific value).

        if (campaignParam) {
            params.push(campaignParam);
            sql += ` AND don."CampaignID" = $${paramIdx}`;
            paramIdx++;
        }

        const assignedTo = searchParams.get('assignedTo');
        if (assignedTo === 'me') {
            // @ts-ignore
            params.push(session.user.id || (session.user as any).UserID);
            sql += ` AND d."AssignedStafferID" = $${paramIdx}`;
            paramIdx++;
        } else if (assignedTo) {
            params.push(parseInt(assignedTo));
            sql += ` AND d."AssignedStafferID" = $${paramIdx}`;
            paramIdx++;
        }

        sql += ` ORDER BY "LifetimeValue" DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`;

        const res = await query(sql, params);

        // Count for pagination
        // (Simplified count for speed, ideally we count total matching rows)
        // const countRes = await query(`SELECT COUNT(*) FROM "Donors" d WHERE ...`); 

        return NextResponse.json({
            data: res.rows,
            page,
            hasMore: res.rows.length === limit
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
