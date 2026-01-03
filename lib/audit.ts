
import { query } from '@/lib/db';

export async function logAudit(
    userId: number,
    action: string,
    entityId: string | null = null,
    details: string | null = null,
    ipAddress: string | null = null
) {
    try {
        await query(
            `INSERT INTO "AuditLogs" ("UserID", "Action", "EntityID", "Details", "IPAddress") 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, entityId, details, ipAddress]
        );
    } catch (e) {
        console.error('Failed to write audit log:', e);
        // Do not crash the app if audit log fails, but ideally strictly log this failure
    }
}

export const logAction = logAudit;
