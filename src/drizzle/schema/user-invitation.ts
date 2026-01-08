import { pgTable, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { organization } from './organizations';
import { role } from './rbac';

// Invitation status enum
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'cancelled',
]);

/**
 * User invitations table
 * Used when super admins create organizations and invite initial admins
 */
export const userInvitation = pgTable('user_invitation', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name'),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  roleId: text('role_id')
    .notNull()
    .references(() => role.id),
  invitedBy: text('invited_by').notNull(),
  token: text('token').notNull().unique(),
  status: invitationStatusEnum('status').default('pending').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
