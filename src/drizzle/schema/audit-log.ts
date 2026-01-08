import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { user } from './auth';

/**
 * Audit log for tracking important system events
 * Includes tenant switches, permission changes, and security events
 */
export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  action: text('action').notNull(), // e.g., 'tenant_switch', 'permission_change', 'login', 'logout'
  resourceType: text('resource_type'), // e.g., 'organization', 'user', 'role'
  resourceId: text('resource_id'), // ID of the affected resource
  metadata: jsonb('metadata'), // Additional context (old/new values, IP, user agent, etc.)
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
