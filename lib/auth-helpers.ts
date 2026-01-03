import { query } from '@/lib/db';

export type UserSession = {
    id: string;
    role: 'Admin' | 'Clerk' | 'ClientUser';
    allowedClientIds?: number[];
};

/**
 * Verifies if a user has permission to modify a Donation.
 * Admin/Clerk: Access all.
 * ClientUser: Access only donations belonging to their assigned clients.
 */
export async function verifyDonationAccess(user: UserSession, donationId: number | string): Promise<boolean> {
    if (user.role === 'Admin' || user.role === 'Clerk') return true;

    if (!user.allowedClientIds || user.allowedClientIds.length === 0) return false;

    const res = await query('SELECT "ClientID" FROM "Donations" WHERE "DonationID" = $1', [donationId]);
    if (res.rows.length === 0) return false; // Donation doesn't exist, effectively no access

    const donationClientId = res.rows[0].ClientID;
    return user.allowedClientIds.includes(donationClientId);
}

/**
 * Verifies if a user has permission to modify a Batch.
 */
export async function verifyBatchAccess(user: UserSession, batchId: number | string): Promise<boolean> {
    if (user.role === 'Admin' || user.role === 'Clerk') return true;

    if (!user.allowedClientIds || user.allowedClientIds.length === 0) return false;

    const res = await query('SELECT "ClientID" FROM "Batches" WHERE "BatchID" = $1', [batchId]);
    if (res.rows.length === 0) return false;

    const batchClientId = res.rows[0].ClientID;
    return user.allowedClientIds.includes(batchClientId);
}
