import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, primaryKey, index } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { organization } from './organizations';
import { role } from './rbac';

// User-Organization relationship table (many-to-many)
// Allows users to belong to multiple organizations with different roles
export const userOrganization = pgTable(
  'user_organization',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    isDefault: boolean('is_default').default(false).notNull(),
    invitedBy: text('invited_by').references(() => user.id),
    invitedAt: timestamp('invited_at'),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
    lastAccessedAt: timestamp('last_accessed_at'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.organizationId] }),
    userIdx: index('user_organization_user_idx').on(table.userId),
    orgIdx: index('user_organization_org_idx').on(table.organizationId),
    roleIdx: index('user_organization_role_idx').on(table.roleId),
  })
);

// Relations
export const userOrganizationRelations = relations(userOrganization, ({ one }) => ({
  user: one(user, {
    fields: [userOrganization.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [userOrganization.organizationId],
    references: [organization.id],
  }),
  role: one(role, {
    fields: [userOrganization.roleId],
    references: [role.id],
  }),
  invitedByUser: one(user, {
    fields: [userOrganization.invitedBy],
    references: [user.id],
  }),
}));

// Update organization relations to include user organizations
export const organizationRelations = relations(organization, ({ many }) => ({
  userOrganizations: many(userOrganization),
}));
