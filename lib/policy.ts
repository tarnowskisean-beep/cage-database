import { query } from '@/lib/db';

export interface Policy {
    PolicyID: number;
    PolicyType: string;
    Version: string;
    Content: string;
    IsActive: boolean;
    CreatedAt: string;
}

export async function getPendingPolicies(userId: number | string): Promise<Policy[]> {
    try {
        const res = await query(`
            SELECT p.*
            FROM "Policies" p
            LEFT JOIN "PolicyAcceptances" pa ON p."PolicyID" = pa."PolicyID" AND pa."UserID" = $1
            WHERE p."IsActive" = TRUE
            AND (pa."AcceptanceID" IS NULL)
        `, [userId]);

        return res.rows as Policy[];
    } catch (e) {
        console.error('Failed to check policies', e);
        return [];
    }
}
