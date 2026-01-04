import { query } from '@/lib/db';
import { getServerSession } from 'next-auth'; // Keep this for server-side usage if needed context

/**
 * Log a sensitive action to the database for SOC 2 compliance.
 * @param action - The action performed (e.g., 'LOGIN', 'CREATE', 'DELETE')
 * @param entityType - The type of entity affected (e.g., 'BATCH', 'USER')
 * @param entityId - The ID of the entity (optional)
 * @param details - Additional context or JSON string
 * @param actor - The user performing the action (email or name)
 */
export async function logAudit(action: string, entityType: string, entityId: string | number | null, details: string, actor: string) {
    try {
        await query(
            `INSERT INTO "AuditLogs" ("Action", "EntityType", "EntityID", "Details", "Actor", "CreatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [action, entityType, String(entityId || ''), details, actor]
        );
    } catch (e) {
        // Fallback: Start by logging to console so we don't break the app flow if DB fails
        console.error('FAILED TO LOG AUDIT:', e);
    }
}
