import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { db } from '@/db/db';
import { organization, userOrganization } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from './session';
import {
  TenantNotSelectedError,
  NoTenantAccessError,
  TenantAccessDeniedError,
} from './errors/tenant-errors';
import { logTenantSwitch } from './audit';
import {
  isTenantSwitchRateLimited,
  getRemainingTenantSwitches,
  getTenantSwitchResetTime,
} from './rate-limiter';
import { TenantSwitchRateLimitError } from './errors/tenant-errors';

/**
 * Get the current tenant ID from session context
 * Returns null if no tenant context is available
 *
 * Priority order:
 * 1. Subdomain (acme.yourapp.com or acme.localhost:3000) - PRIMARY for multi-tenant SaaS
 * 2. X-Tenant-ID header - For API calls
 * 3. Cookie - For session-based tenant switching
 * 4. User's default organization - Fallback
 *
 * For super admins: Uses selected tenant from cookie/header
 * For regular users: Uses assigned organization
 */
export const getTenantId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  if (!session?.user) return null;

  // Use pre-computed isSuperAdmin from session (no extra DB query)
  const isSuperAdmin = session.user.isSuperAdmin;

  const headersList = await headers();

  // PRIORITY 1: Check subdomain (PRIMARY for multi-tenant SaaS)
  const host = headersList.get('host') || '';
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');

  if (parts.length >= 2) {
    const subdomain = parts[0];
    const domain = parts[parts.length - 1];

    // Valid subdomain detection
    if (subdomain && subdomain !== 'www' && !(domain === 'localhost' && parts.length === 1)) {
      const [org] = await db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.subdomain, subdomain))
        .limit(1);

      if (org) {
        // Verify user has access to this subdomain's organization
        if (isSuperAdmin) {
          // Super admins have access to all organizations
          return org.id;
        } else {
          // Regular users: check if they're assigned to this organization
          const [userOrg] = await db
            .select({ organizationId: userOrganization.organizationId })
            .from(userOrganization)
            .where(
              and(
                eq(userOrganization.userId, session.user.id),
                eq(userOrganization.organizationId, org.id)
              )
            )
            .limit(1);

          if (userOrg) {
            return org.id;
          } else {
            // User is trying to access a subdomain they don't have access to
            // Throw error instead of falling back to their default org
            throw new TenantAccessDeniedError(
              `You do not have access to this organization. Please contact your administrator.`
            );
          }
        }
      }
    }
  }

  // PRIORITY 2: Check for tenant override in headers (for API calls)
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
    const [firstOrg] = await db.select({ id: organization.id }).from(organization).limit(1);

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
    const isSuperAdmin = session?.user?.isSuperAdmin ?? false;

    if (isSuperAdmin) {
      throw new TenantNotSelectedError();
    } else {
      throw new NoTenantAccessError();
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

export async function hasAccessToTenant(tenantId: string): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;

  const isSuperAdmin = session.user.isSuperAdmin;

  if (isSuperAdmin) {
    const [org] = await db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.id, tenantId))
      .limit(1);

    return !!org;
  }

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
 *
 * Includes rate limiting and audit logging
 */
export async function setCurrentTenant(
  tenantId: string,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  const session = await getSession();

  if (!session?.user) {
    throw new TenantAccessDeniedError('Authentication required');
  }

  // Check rate limit
  if (await isTenantSwitchRateLimited(session.user.id)) {
    const remaining = await getRemainingTenantSwitches(session.user.id);
    const resetTime = await getTenantSwitchResetTime(session.user.id);
    throw new TenantSwitchRateLimitError(
      `Too many tenant switches. ${remaining} remaining. Try again in ${resetTime} seconds.`
    );
  }

  const hasAccess = await hasAccessToTenant(tenantId);

  if (!hasAccess) {
    throw new TenantAccessDeniedError();
  }

  const oldTenantId = await getTenantId();

  const cookieStore = await cookies();
  cookieStore.set('currentOrganizationId', tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  logTenantSwitch(session.user.id, oldTenantId, tenantId, ipAddress, userAgent).catch((error) => {
    console.error('Failed to log tenant switch:', error);
  });
}
