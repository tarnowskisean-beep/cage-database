import { query } from '@/lib/db';
import { getServerSession } from 'next-auth'; // Keep this for server-side usage if needed context

/**
 * Log a sensitive action to the database for SOC 2 compliance.
 * @param userId - The ID of the user performing the action
 * @param action - The action performed (e.g., 'LOGIN', 'CREATE_DONATION')
 * @param entityId - The ID of the entity (optional)
 * @param details - Additional context or JSON object
 * @param ipAddress - Request IP if available
 */
export async function logAudit(
    userId: number | string,
    action: string,
    entityId: string | number | null,
    details: any,
    ipAddress?: string
) {
    try {
        const detailsStr = typeof details === 'string' ? details : JSON.stringify(details);

        await query(
            `INSERT INTO "AuditLogs" ("UserID", "Action", "EntityID", "Details", "IPAddress") 
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, action, String(entityId || ''), detailsStr, ipAddress || null]
        );
    } catch (e) {
        // Fallback: Start by logging to console so we don't break the app flow if DB fails
        console.error('FAILED TO LOG AUDIT:', e);
    }
}
