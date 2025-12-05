import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import { userRole, rolePermission, role, permission } from '@/drizzle/schema';

/**
 * Check if a user has a specific role
 * @param userId - The user's ID
 * @param roleName - The role name to check
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(
  userId: string,
  roleName: string,
): Promise<boolean> {
  const result = await db
    .select()
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(and(eq(userRole.userId, userId), eq(role.name, roleName)))
    .limit(1);

  return result.length > 0;
}

/**
 * Check if a user has any of the specified roles
 * @param userId - The user's ID
 * @param roleNames - Array of role names to check
 * @returns true if user has any of the roles, false otherwise
 */
export async function hasAnyRole(
  userId: string,
  roleNames: string[],
): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.some((r) => roleNames.includes(r.name));
}

/**
 * Get all roles assigned to a user
 * @param userId - The user's ID
 * @returns Array of role objects
 */
export async function getUserRoles(userId: string) {
  const result = await db
    .select({
      id: role.id,
      name: role.name,
      description: role.description,
    })
    .from(userRole)
    .innerJoin(role, eq(userRole.roleId, role.id))
    .where(eq(userRole.userId, userId));

  return result;
}

/**
 * Get all permissions for a user (through their roles)
 * @param userId - The user's ID
 * @returns Array of permission objects
 */
export async function getUserPermissions(userId: string) {
  const result = await db
    .select({
      id: permission.id,
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    })
    .from(userRole)
    .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(eq(userRole.userId, userId));

  return result;
}

/**
 * Check if a user has a specific permission
 * @param userId - The user's ID
 * @param permissionName - The permission name to check (e.g., 'products:create')
 * @returns true if user has the permission, false otherwise
 */
export async function hasPermission(
  userId: string,
  permissionName: string,
): Promise<boolean> {
  const result = await db
    .select()
    .from(userRole)
    .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(and(eq(userRole.userId, userId), eq(permission.name, permissionName)))
    .limit(1);

  return result.length > 0;
}

/**
 * Check if a user can perform an action on a resource
 * @param userId - The user's ID
 * @param resource - The resource name (e.g., 'products', 'orders')
 * @param action - The action (e.g., 'create', 'read', 'update', 'delete')
 * @returns true if user has the permission, false otherwise
 */
export async function can(
  userId: string,
  resource: string,
  action: string,
): Promise<boolean> {
  const result = await db
    .select()
    .from(userRole)
    .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(
      and(
        eq(userRole.userId, userId),
        eq(permission.resource, resource),
        eq(permission.action, action),
      ),
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Assign a role to a user
 * @param userId - The user's ID
 * @param roleId - The role's ID
 */
export async function assignRole(userId: string, roleId: string) {
  await db.insert(userRole).values({ userId, roleId });
}

/**
 * Remove a role from a user
 * @param userId - The user's ID
 * @param roleId - The role's ID
 */
export async function removeRole(userId: string, roleId: string) {
  await db
    .delete(userRole)
    .where(and(eq(userRole.userId, userId), eq(userRole.roleId, roleId)));
}

/**
 * Assign a permission to a role
 * @param roleId - The role's ID
 * @param permissionId - The permission's ID
 */
export async function assignPermission(roleId: string, permissionId: string) {
  await db.insert(rolePermission).values({ roleId, permissionId });
}

/**
 * Remove a permission from a role
 * @param roleId - The role's ID
 * @param permissionId - The permission's ID
 */
export async function removePermission(roleId: string, permissionId: string) {
  await db
    .delete(rolePermission)
    .where(
      and(
        eq(rolePermission.roleId, roleId),
        eq(rolePermission.permissionId, permissionId),
      ),
    );
}

// Role constants for easy reference
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CASHIER: 'cashier',
  KITCHEN: 'kitchen',
  INVENTORY: 'inventory',
} as const;

// Permission action constants
export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;

// Resource constants
export const RESOURCES = {
  PRODUCTS: 'products',
  ORDERS: 'orders',
  USERS: 'users',
  INVENTORY: 'inventory',
  REPORTS: 'reports',
  SETTINGS: 'settings',
} as const;
