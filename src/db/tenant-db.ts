import { db } from './db';
import { requireTenantId } from '@/lib/tenant-context';
import { hasRole } from '@/lib/rbac';
import { getSession } from '@/lib/session';
import { eq, and, SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

/**
 * Execute a query function with tenant context
 * Automatically injects the current tenant ID
 *
 * @example
 * const products = await tenantQuery(async (tenantId) => {
 *   return db.select().from(product).where(eq(product.organizationId, tenantId));
 * });
 */
export async function tenantQuery<T>(queryFn: (tenantId: string) => Promise<T>): Promise<T> {
  const tenantId = await requireTenantId();
  return queryFn(tenantId);
}

/**
 * Helper to add tenant condition to WHERE clauses
 * Automatically includes organizationId filter
 *
 * @example
 * const condition = await withTenantCondition(product, [
 *   eq(product.status, true),
 *   isNull(product.deletedAt)
 * ]);
 * const products = await db.select().from(product).where(condition);
 */
export async function withTenantCondition<T extends { organizationId: AnyPgColumn }>(
  table: T,
  additionalConditions?: SQL[]
): Promise<SQL | undefined> {
  const tenantId = await requireTenantId();
  const conditions: SQL[] = [eq(table.organizationId, tenantId)];

  if (additionalConditions && additionalConditions.length > 0) {
    conditions.push(...additionalConditions);
  }

  return and(...conditions);
}

/**
 * Execute a query that spans multiple tenants
 * Only available to super admins
 *
 * @example
 * const allProducts = await crossTenantQuery(async () => {
 *   return db.select().from(product);
 * });
 */
export async function crossTenantQuery<T>(queryFn: () => Promise<T>): Promise<T> {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Authentication required for cross-tenant queries');
  }

  // Check if user is super admin
  const isSuperAdmin = await hasRole(session.user.id, 'super_admin');

  if (!isSuperAdmin) {
    throw new Error('Only super administrators can perform cross-tenant queries');
  }

  return queryFn();
}

/**
 * Execute a query with a specific tenant context
 * Only available to super admins or users with access to the specified tenant
 *
 * @example
 * const products = await withTenant('tenant-id-123', async (tenantId) => {
 *   return db.select().from(product).where(eq(product.organizationId, tenantId));
 * });
 */
export async function withTenant<T>(
  tenantId: string,
  queryFn: (tenantId: string) => Promise<T>
): Promise<T> {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Authentication required');
  }

  // Check if user is super admin
  const isSuperAdmin = await hasRole(session.user.id, 'super_admin');

  if (!isSuperAdmin) {
    // Check if user has access to this tenant
    const { hasAccessToTenant } = await import('@/lib/tenant-context');
    const hasAccess = await hasAccessToTenant(tenantId);

    if (!hasAccess) {
      throw new Error('You do not have access to this organization');
    }
  }

  return queryFn(tenantId);
}

/**
 * Helper to validate tenant ID in request
 * Ensures the ID from request matches user's current tenant (unless super admin)
 */
export async function validateTenantAccess(resourceTenantId: string): Promise<void> {
  const session = await getSession();

  if (!session?.user) {
    throw new Error('Authentication required');
  }

  // Super admins can access any tenant
  const isSuperAdmin = await hasRole(session.user.id, 'super_admin');
  if (isSuperAdmin) {
    return;
  }

  // Regular users must access resources from their current tenant
  const currentTenantId = await requireTenantId();

  if (resourceTenantId !== currentTenantId) {
    throw new Error('Access denied: Resource belongs to a different organization');
  }
}

export { db };
