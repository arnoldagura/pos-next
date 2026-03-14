import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, primaryKey, index, boolean } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { organization } from './organizations';

// Roles table
export const role = pgTable(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'cascade',
    }),
    isGlobal: boolean('is_global').default(false).notNull(), // For super_admin role
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('role_org_idx').on(table.organizationId),
    index('role_name_org_idx').on(table.name, table.organizationId),
  ]
);

// Permissions table
export const permission = pgTable(
  'permission',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    resource: text('resource').notNull(), // e.g., 'products', 'orders', 'users'
    action: text('action').notNull(), // e.g., 'create', 'read', 'update', 'delete'
    organizationId: text('organization_id').references(() => organization.id, {
      onDelete: 'cascade',
    }),
    isGlobal: boolean('is_global').default(false).notNull(), // For system-wide permissions
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('permission_org_idx').on(table.organizationId),
    index('permission_name_org_idx').on(table.name, table.organizationId),
  ]
);

// User-Roles relationship (many-to-many)
export const userRole = pgTable(
  'user_role',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
    userIdx: index('user_role_userId_idx').on(table.userId),
    roleIdx: index('user_role_roleId_idx').on(table.roleId),
  })
);

// Role-Permissions relationship (many-to-many)
export const rolePermission = pgTable(
  'role_permission',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
    roleIdx: index('role_permission_roleId_idx').on(table.roleId),
    permissionIdx: index('role_permission_permissionId_idx').on(table.permissionId),
  })
);

// Relations
export const roleRelations = relations(role, ({ many, one }) => ({
  userRoles: many(userRole),
  rolePermissions: many(rolePermission),
  organization: one(organization, {
    fields: [role.organizationId],
    references: [organization.id],
  }),
}));

export const permissionRelations = relations(permission, ({ many, one }) => ({
  rolePermissions: many(rolePermission),
  organization: one(organization, {
    fields: [permission.organizationId],
    references: [organization.id],
  }),
}));

export const userRoleRelations = relations(userRole, ({ one }) => ({
  user: one(user, {
    fields: [userRole.userId],
    references: [user.id],
  }),
  role: one(role, {
    fields: [userRole.roleId],
    references: [role.id],
  }),
}));

export const rolePermissionRelations = relations(rolePermission, ({ one }) => ({
  role: one(role, {
    fields: [rolePermission.roleId],
    references: [role.id],
  }),
  permission: one(permission, {
    fields: [rolePermission.permissionId],
    references: [permission.id],
  }),
}));
