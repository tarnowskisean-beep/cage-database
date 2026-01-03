import { query } from '@/lib/db';

export async function logAction(
    userId: number,
    action: string,
    entityId: string | number,
    details?: string,
    ipAddress?: string
) {
    try {
        await query(
            `INSERT INTO "AuditLogs" ("UserID", "Action", "EntityID", "Details", "IPAddress")
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, entityId.toString(), details || '', ipAddress || '']
        );
    } catch (e) {
        console.error('Failed to log audit event:', e);
        // We don't throw here to prevent blocking the main action, 
        // but in strict SOC 2 envs, this might be a critical failure.
        // For this app, we log to console as fallback.
    }
}
