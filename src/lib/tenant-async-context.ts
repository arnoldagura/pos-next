import { AsyncLocalStorage } from 'async_hooks';

/**
 * Tenant context using AsyncLocalStorage
 * Provides a safer alternative to header mutation
 * Each request gets its own isolated tenant context
 */

interface TenantContext {
  tenantId: string;
  userId: string;
  isSuperAdmin: boolean;
}

export const tenantAsyncContext = new AsyncLocalStorage<TenantContext>();

/**
 * Get tenant ID from async context
 * Returns null if not in a tenant context
 */
export function getTenantFromContext(): string | null {
  const context = tenantAsyncContext.getStore();
  return context?.tenantId ?? null;
}

/**
 * Get full tenant context
 */
export function getTenantContext(): TenantContext | undefined {
  return tenantAsyncContext.getStore();
}

/**
 * Check if current context is for a super admin
 */
export function isSuperAdminContext(): boolean {
  const context = tenantAsyncContext.getStore();
  return context?.isSuperAdmin ?? false;
}

/**
 * Get user ID from context
 */
export function getUserIdFromContext(): string | null {
  const context = tenantAsyncContext.getStore();
  return context?.userId ?? null;
}
