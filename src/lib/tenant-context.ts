import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { db } from '@/db/db';
import { organization, userOrganization } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from './session';

/**
 * Get the current tenant ID from session context
 * Returns null if no tenant context is available
 *
 * For super admins: Uses selected tenant from cookie/header
 * For regular users: Uses assigned organization
 */
export const getTenantId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  if (!session?.user) return null;

  // Check if user is super admin
  const { hasRole } = await import('./rbac');
  const isSuperAdmin = await hasRole(session.user.id, 'super_admin');

  // Check for tenant override in headers (for API calls)
  const headersList = await headers();
  const headerTenantId = headersList.get('x-tenant-id');
  if (headerTenantId) return headerTenantId;

  // Check for tenant in cookies (set when user switches organizations)
  const cookieStore = await cookies();
  const cookieTenantId = cookieStore.get('currentOrganizationId')?.value;

  if (cookieTenantId) {
    // For super admins, always allow cookie tenant (they can access any org)
    // For regular users, verify they have access to this org
    if (isSuperAdmin) {
      // Verify the organization exists
      const [org] = await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.id, cookieTenantId))
        .limit(1);

      if (org) return cookieTenantId;
    } else {
      // Verify user has access to this organization
      const [userOrg] = await db
        .select({ organizationId: userOrganization.organizationId })
        .from(userOrganization)
        .where(
          and(
            eq(userOrganization.userId, session.user.id),
            eq(userOrganization.organizationId, cookieTenantId)
          )
        )
        .limit(1);

      if (userOrg) return cookieTenantId;
    }
  }

  // Super admins: Fall back to first available organization
  if (isSuperAdmin) {
    const [firstOrg] = await db
      .select({ id: organization.id })
      .from(organization)
      .limit(1);

    return firstOrg?.id || null;
  }

  // Regular users: Get their default organization or first organization
  const userOrgs = await db
    .select({
      organizationId: userOrganization.organizationId,
      isDefault: userOrganization.isDefault,
    })
    .from(userOrganization)
    .where(eq(userOrganization.userId, session.user.id))
    .orderBy(userOrganization.isDefault);

  if (userOrgs.length === 0) return null;

  // Return default org or first org
  const defaultOrg = userOrgs.find((org) => org.isDefault);
  return defaultOrg?.organizationId || userOrgs[0]?.organizationId || null;
});

/**
 * Require tenant ID - throws if no tenant context is available
 * Use this in API routes and server components that require tenant context
 *
 * For super admins: Returns selected tenant from cookie/header
 * For regular users: Returns their assigned organization
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId();

  if (!tenantId) {
    const session = await getSession();
    const { hasRole } = await import('./rbac');
    const isSuperAdmin = session?.user ? await hasRole(session.user.id, 'super_admin') : false;

    if (isSuperAdmin) {
      throw new Error('No tenant selected. Please select an organization from the sidebar.');
    } else {
      throw new Error('No tenant context available. User must be assigned to an organization.');
    }
  }

  return tenantId;
}

/**
 * Get the current tenant organization details
 * Returns null if no tenant context is available
 */
export const getCurrentTenant = cache(async () => {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const [tenant] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, tenantId))
    .limit(1);

  return tenant || null;
});

/**
 * Get all organizations for the current user
 */
export const getUserOrganizations = cache(async () => {
  const session = await getSession();
  if (!session?.user) return [];

  const userOrgs = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      subscriptionTier: organization.subscriptionTier,
      isDefault: userOrganization.isDefault,
      roleId: userOrganization.roleId,
    })
    .from(userOrganization)
    .innerJoin(organization, eq(userOrganization.organizationId, organization.id))
    .where(eq(userOrganization.userId, session.user.id));

  return userOrgs;
});

/**
 * Check if the current user has access to a specific tenant
 * Super admins have access to all tenants
 */
export async function hasAccessToTenant(tenantId: string): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;

  // Check if super admin
  const { hasRole } = await import('./rbac');
  const isSuperAdmin = await hasRole(session.user.id, 'super_admin');

  if (isSuperAdmin) {
    // Super admins have access to all organizations
    // Just verify the organization exists
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, tenantId))
      .limit(1);

    return !!org;
  }

  // Regular users: check if they're assigned to this organization
  const [result] = await db
    .select()
    .from(userOrganization)
    .where(
      and(
        eq(userOrganization.userId, session.user.id),
        eq(userOrganization.organizationId, tenantId)
      )
    )
    .limit(1);

  return !!result;
}

/**
 * Set the current tenant ID in cookies
 * Used when users switch between organizations
 * Super admins can switch to any organization
 */
export async function setCurrentTenant(tenantId: string): Promise<void> {
  // Verify user has access to this tenant (includes super admin check)
  const hasAccess = await hasAccessToTenant(tenantId);

  if (!hasAccess) {
    throw new Error('You do not have access to this organization');
  }

  const cookieStore = await cookies();
  cookieStore.set('currentOrganizationId', tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });
}
