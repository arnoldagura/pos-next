import { db } from '@/db/db';
import { eq, and } from 'drizzle-orm';
import {
  userRole,
  rolePermission,
  role,
  permission,
  userOrganization,
} from '@/drizzle/schema';

/**
 * Check if a user has a specific role
 * @param userId - The user's ID
 * @param roleName - The role name to check
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(
  userId: string,
  roleName: string
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
  roleNames: string[]
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
 * Get all permissions for a user (through their roles) - supports both legacy and multi-tenant
 * @deprecated Use getUserPermissionsInTenant() for tenant-specific permissions
 * @param userId - The user's ID
 * @returns Array of permission objects (deduplicated)
 */
export async function getUserPermissions(userId: string) {
  // Get permissions from legacy userRole table
  const legacyPermissions = await db
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

  // Get permissions from multi-tenant userOrganization table
  const tenantPermissions = await db
    .select({
      id: permission.id,
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    })
    .from(userOrganization)
    .innerJoin(
      rolePermission,
      eq(userOrganization.roleId, rolePermission.roleId)
    )
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(eq(userOrganization.userId, userId));

  // Deduplicate permissions by ID
  const permissionMap = new Map();
  [...legacyPermissions, ...tenantPermissions].forEach((perm) => {
    permissionMap.set(perm.id, perm);
  });

  return Array.from(permissionMap.values());
}

/**
 * Check if a user has a specific permission (legacy - non-tenant-aware)
 * @deprecated Use canInTenant() for multi-tenant permission checks
 * @param userId - The user's ID
 * @param permissionName - The permission name to check (e.g., 'products:create')
 * @returns true if user has the permission, false otherwise
 */
export async function hasPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  // Check super admin first (global permissions)
  const isSuperAdmin = await hasRole(userId, ROLES.SUPER_ADMIN);
  if (isSuperAdmin) {
    return true;
  }

  // Check legacy userRole table
  const legacyResult = await db
    .select()
    .from(userRole)
    .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(
      and(eq(userRole.userId, userId), eq(permission.name, permissionName))
    )
    .limit(1);

  if (legacyResult.length > 0) {
    return true;
  }

  // Check multi-tenant userOrganization table (any organization)
  const tenantResult = await db
    .select()
    .from(userOrganization)
    .innerJoin(
      rolePermission,
      eq(userOrganization.roleId, rolePermission.roleId)
    )
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(
      and(eq(userOrganization.userId, userId), eq(permission.name, permissionName))
    )
    .limit(1);

  return tenantResult.length > 0;
}

/**
 * Check if a user can perform an action on a resource (legacy - non-tenant-aware)
 * @deprecated Use canInTenant() for multi-tenant permission checks
 * @param userId - The user's ID
 * @param resource - The resource name (e.g., 'products', 'orders')
 * @param action - The action (e.g., 'create', 'read', 'update', 'delete')
 * @returns true if user has the permission, false otherwise
 */
export async function can(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  // Check super admin first (global permissions)
  const isSuperAdmin = await hasRole(userId, ROLES.SUPER_ADMIN);
  if (isSuperAdmin) {
    return true;
  }

  // Check legacy userRole table
  const legacyResult = await db
    .select()
    .from(userRole)
    .innerJoin(rolePermission, eq(userRole.roleId, rolePermission.roleId))
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(
      and(
        eq(userRole.userId, userId),
        eq(permission.resource, resource),
        eq(permission.action, action)
      )
    )
    .limit(1);

  if (legacyResult.length > 0) {
    return true;
  }

  // Check multi-tenant userOrganization table (any organization)
  const tenantResult = await db
    .select()
    .from(userOrganization)
    .innerJoin(
      rolePermission,
      eq(userOrganization.roleId, rolePermission.roleId)
    )
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(
      and(
        eq(userOrganization.userId, userId),
        eq(permission.resource, resource),
        eq(permission.action, action)
      )
    )
    .limit(1);

  return tenantResult.length > 0;
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
        eq(rolePermission.permissionId, permissionId)
      )
    );
}

// Role constants for easy reference
export const ROLES = {
  SUPER_ADMIN: 'super_admin', // Global super admin
  ADMIN: 'admin', // Tenant admin
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
  TENANTS: 'tenants',
} as const;

// ============================================================================
// TENANT-SCOPED RBAC FUNCTIONS
// ============================================================================

/**
 * Check if a user has a specific role within an organization
 * @param userId - The user's ID
 * @param roleName - The role name to check
 * @param organizationId - The organization ID
 * @returns true if user has the role in the organization, false otherwise
 */
export async function hasRoleInTenant(
  userId: string,
  roleName: string,
  organizationId: string
): Promise<boolean> {
  // Check for super admin first (global role)
  if (roleName === ROLES.SUPER_ADMIN) {
    const result = await db
      .select()
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(
        and(
          eq(userRole.userId, userId),
          eq(role.name, ROLES.SUPER_ADMIN),
          eq(role.isGlobal, true)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  // Check org-specific role
  const result = await db
    .select()
    .from(userOrganization)
    .innerJoin(role, eq(userOrganization.roleId, role.id))
    .where(
      and(
        eq(userOrganization.userId, userId),
        eq(userOrganization.organizationId, organizationId),
        eq(role.name, roleName)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Check if a user has any of the specified roles within an organization
 * @param userId - The user's ID
 * @param roleNames - Array of role names to check
 * @param organizationId - The organization ID
 * @returns true if user has any of the roles in the organization, false otherwise
 */
export async function hasAnyRoleInTenant(
  userId: string,
  roleNames: string[],
  organizationId: string
): Promise<boolean> {
  const roles = await getUserRolesInTenant(userId, organizationId);
  return roles.some((r) => roleNames.includes(r.name));
}

/**
 * Get all roles assigned to a user within an organization
 * @param userId - The user's ID
 * @param organizationId - The organization ID
 * @returns Array of role objects
 */
export async function getUserRolesInTenant(
  userId: string,
  organizationId: string
) {
  const result = await db
    .select({
      id: role.id,
      name: role.name,
      description: role.description,
    })
    .from(userOrganization)
    .innerJoin(role, eq(userOrganization.roleId, role.id))
    .where(
      and(
        eq(userOrganization.userId, userId),
        eq(userOrganization.organizationId, organizationId)
      )
    );

  return result;
}

/**
 * Get all permissions for a user within an organization (through their roles)
 * @param userId - The user's ID
 * @param organizationId - The organization ID
 * @returns Array of permission objects
 */
export async function getUserPermissionsInTenant(
  userId: string,
  organizationId: string
) {
  const result = await db
    .select({
      id: permission.id,
      name: permission.name,
      resource: permission.resource,
      action: permission.action,
      description: permission.description,
    })
    .from(userOrganization)
    .innerJoin(
      rolePermission,
      eq(userOrganization.roleId, rolePermission.roleId)
    )
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(
      and(
        eq(userOrganization.userId, userId),
        eq(userOrganization.organizationId, organizationId)
      )
    );

  return result;
}

/**
 * Check if a user can perform an action on a resource within an organization
 * @param userId - The user's ID
 * @param resource - The resource name (e.g., 'products', 'orders')
 * @param action - The action (e.g., 'create', 'read', 'update', 'delete')
 * @param organizationId - The organization ID
 * @returns true if user has the permission in the organization, false otherwise
 */
export async function canInTenant(
  userId: string,
  resource: string,
  action: string,
  organizationId: string
): Promise<boolean> {
  // Check super admin first (global permissions)
  const isSuperAdmin = await hasRole(userId, ROLES.SUPER_ADMIN);
  if (isSuperAdmin) {
    return true;
  }

  // Check org-specific permissions
  const result = await db
    .select()
    .from(userOrganization)
    .innerJoin(
      rolePermission,
      eq(userOrganization.roleId, rolePermission.roleId)
    )
    .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
    .where(
      and(
        eq(userOrganization.userId, userId),
        eq(userOrganization.organizationId, organizationId),
        eq(permission.resource, resource),
        eq(permission.action, action)
      )
    )
    .limit(1);

  return result.length > 0;
}

/**
 * Assign a role to a user within an organization
 * @param userId - The user's ID
 * @param roleId - The role's ID
 * @param organizationId - The organization ID
 */
export async function assignRoleInTenant(
  userId: string,
  roleId: string,
  organizationId: string
) {
  await db.insert(userOrganization).values({
    userId,
    roleId,
    organizationId,
  });
}

/**
 * Remove a role from a user within an organization
 * @param userId - The user's ID
 * @param organizationId - The organization ID
 */
export async function removeRoleFromTenant(
  userId: string,
  organizationId: string
) {
  await db
    .delete(userOrganization)
    .where(
      and(
        eq(userOrganization.userId, userId),
        eq(userOrganization.organizationId, organizationId)
      )
    );
}

/**
 * Check if user is super admin (global role)
 * @param userId - The user's ID
 * @returns true if user is super admin, false otherwise
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, ROLES.SUPER_ADMIN);
}
