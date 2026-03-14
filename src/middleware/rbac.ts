import { NextRequest, NextResponse } from 'next/server';
import { hasAnyRoleInTenant, canInTenant } from '@/lib/rbac';
import { getTenantId } from '@/lib/tenant-context';
import { getSession } from '@/lib/session';
import { tenantAsyncContext } from '@/lib/tenant-async-context';

/**
 * Standardized API error response
 */
interface APIError {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Error codes for consistent client-side handling
 */
export const ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  SUPER_ADMIN_REQUIRED: 'SUPER_ADMIN_REQUIRED',
  NO_TENANT_CONTEXT: 'NO_TENANT_CONTEXT',
  TENANT_ACCESS_DENIED: 'TENANT_ACCESS_DENIED',
} as const;

/**
 * Create standardized error response
 */
function createErrorResponse(
  error: string,
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): Response {
  const body: APIError = { error, code, message };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * Request-scoped permission cache to avoid redundant DB queries
 */
const permissionCache = new Map<string, Map<string, boolean>>();

function getCachedPermission(
  requestId: string,
  userId: string,
  tenantId: string,
  resource: string,
  action: string
): boolean | undefined {
  const cache = permissionCache.get(requestId);
  if (!cache) return undefined;

  const key = `${userId}:${tenantId}:${resource}:${action}`;
  return cache.get(key);
}

function setCachedPermission(
  requestId: string,
  userId: string,
  tenantId: string,
  resource: string,
  action: string,
  hasAccess: boolean
): void {
  let cache = permissionCache.get(requestId);
  if (!cache) {
    cache = new Map();
    permissionCache.set(requestId, cache);
  }

  const key = `${userId}:${tenantId}:${resource}:${action}`;
  cache.set(key, hasAccess);

  // Clean up cache after request (5 seconds should be enough)
  setTimeout(() => {
    permissionCache.delete(requestId);
  }, 5000);
}

/**
 * Protection options for protectRoute
 */
type ProtectionOptions =
  | {
      roles: string[];
      cache?: boolean;
      audit?: boolean;
    }
  | {
      resource: string;
      action: string;
      cache?: boolean;
      audit?: boolean;
    }
  | {
      requireSuperAdmin: boolean;
      audit?: boolean;
    }
  | {
      check: (userId: string, organizationId: string | null) => Promise<boolean>;
      audit?: boolean;
    };

/**
 * Audit log entry for authorization attempts
 */
interface AuthorizationAuditLog {
  timestamp: Date;
  userId: string;
  tenantId: string | null;
  resource?: string;
  action?: string;
  roles?: string[];
  success: boolean;
  path: string;
  method: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log authorization attempt (implement your logging solution here)
 */
async function logAuthorizationAttempt(log: AuthorizationAuditLog): Promise<void> {
  // TODO: Implement your logging solution
  // Examples:
  // - Write to database audit_log table
  // - Send to logging service (e.g., Datadog, CloudWatch)
  // - Write to file

  if (process.env.NODE_ENV === 'development') {
    console.log('[AUTH AUDIT]', {
      ...log,
      timestamp: log.timestamp.toISOString(),
    });
  }

  // In production, you might want to:
  // await db.insert(auditLog).values(log);
}

/**
 * Higher-order function to protect API route handlers with tenant awareness
 *
 * Features:
 * - Multi-tenant aware authorization
 * - Request-scoped permission caching
 * - Standardized error responses with error codes
 * - Optional audit logging
 * - Super admin support
 *
 * @param handler - The API route handler
 * @param options - Protection options (roles, permission, requireSuperAdmin, or custom check)
 * @returns Protected handler
 *
 * @example
 * // Protect with permission check
 * export const GET = protectRoute(getProductsHandler, {
 *   resource: 'products',
 *   action: 'read',
 *   cache: true,
 *   audit: true
 * });
 *
 * @example
 * // Protect with role check
 * export const POST = protectRoute(createProductHandler, {
 *   roles: ['admin', 'manager'],
 *   cache: true
 * });
 *
 * @example
 * // Protect with super admin requirement
 * export const DELETE = protectRoute(deleteOrgHandler, {
 *   requireSuperAdmin: true,
 *   audit: true
 * });
 */
export function protectRoute<T>(
  handler: (req: NextRequest, context?: T) => Promise<Response>,
  options: ProtectionOptions
) {
  return async (req: NextRequest, context?: T) => {
    const requestId = crypto.randomUUID();

    // Get session
    const session = await getSession();

    if (!session?.user) {
      return createErrorResponse(
        'Unauthorized',
        ERROR_CODES.AUTH_REQUIRED,
        'Authentication is required to access this resource',
        401
      );
    }

    // Get tenant ID using centralized tenant context logic
    const tenantId: string | null = await getTenantId();

    // Check for super admin requirement
    if ('requireSuperAdmin' in options && options.requireSuperAdmin) {
      if (!session.user.isSuperAdmin) {
        // Audit log
        if (options.audit !== false) {
          await logAuthorizationAttempt({
            timestamp: new Date(),
            userId: session.user.id,
            tenantId,
            success: false,
            path: req.nextUrl.pathname,
            method: req.method,
          });
        }

        return createErrorResponse(
          'Forbidden',
          ERROR_CODES.SUPER_ADMIN_REQUIRED,
          'Super admin access is required for this action',
          403
        );
      }

      // Use AsyncLocalStorage for tenant context
      if (tenantId) {
        return tenantAsyncContext.run(
          {
            tenantId,
            userId: session.user.id,
            isSuperAdmin: true,
          },
          () => {
            req.headers.set('x-tenant-id', tenantId);
            return handler(req, context);
          }
        );
      }

      return handler(req, context);
    }

    // Require tenant context for non-super-admin routes
    if (!tenantId) {
      return createErrorResponse(
        'Bad Request',
        ERROR_CODES.NO_TENANT_CONTEXT,
        'No tenant context available. Please contact your administrator.',
        400
      );
    }

    let hasAccess = false;
    const enableCache = 'cache' in options ? options.cache !== false : true;

    // Check permissions based on options
    if ('roles' in options) {
      // Role-based check (no caching for roles)
      hasAccess = await hasAnyRoleInTenant(session.user.id, options.roles, tenantId);

      // Audit log
      if (options.audit !== false && !hasAccess) {
        await logAuthorizationAttempt({
          timestamp: new Date(),
          userId: session.user.id,
          tenantId,
          roles: options.roles,
          success: false,
          path: req.nextUrl.pathname,
          method: req.method,
        });
      }
    } else if ('resource' in options && 'action' in options) {
      // Permission-based check with caching
      if (enableCache) {
        const cached = getCachedPermission(
          requestId,
          session.user.id,
          tenantId,
          options.resource,
          options.action
        );

        if (cached !== undefined) {
          hasAccess = cached;
        } else {
          hasAccess = await canInTenant(
            session.user.id,
            options.resource,
            options.action,
            tenantId
          );
          setCachedPermission(
            requestId,
            session.user.id,
            tenantId,
            options.resource,
            options.action,
            hasAccess
          );
        }
      } else {
        hasAccess = await canInTenant(session.user.id, options.resource, options.action, tenantId);
      }

      // Audit log
      if (options.audit !== false && !hasAccess) {
        await logAuthorizationAttempt({
          timestamp: new Date(),
          userId: session.user.id,
          tenantId,
          resource: options.resource,
          action: options.action,
          success: false,
          path: req.nextUrl.pathname,
          method: req.method,
        });
      }
    } else if ('check' in options) {
      // Custom check (no caching)
      hasAccess = await options.check(session.user.id, tenantId);

      // Audit log
      if (options.audit !== false && !hasAccess) {
        await logAuthorizationAttempt({
          timestamp: new Date(),
          userId: session.user.id,
          tenantId,
          success: false,
          path: req.nextUrl.pathname,
          method: req.method,
        });
      }
    }

    if (!hasAccess) {
      const details: Record<string, unknown> = {};

      if ('resource' in options && 'action' in options) {
        details.required = `${options.resource}:${options.action}`;
        details.resource = options.resource;
        details.action = options.action;
      } else if ('roles' in options) {
        details.required_roles = options.roles;
      }

      return createErrorResponse(
        'Forbidden',
        ERROR_CODES.INSUFFICIENT_PERMISSIONS,
        'You do not have permission to perform this action',
        403,
        details
      );
    }

    // Success audit log (optional, only for sensitive operations)
    if (options.audit === true && hasAccess) {
      await logAuthorizationAttempt({
        timestamp: new Date(),
        userId: session.user.id,
        tenantId,
        resource: 'resource' in options ? options.resource : undefined,
        action: 'action' in options ? options.action : undefined,
        roles: 'roles' in options ? options.roles : undefined,
        success: true,
        path: req.nextUrl.pathname,
        method: req.method,
      });
    }

    // Use AsyncLocalStorage for tenant context
    return tenantAsyncContext.run(
      {
        tenantId,
        userId: session.user.id,
        isSuperAdmin: session.user.isSuperAdmin,
      },
      () => {
        req.headers.set('x-tenant-id', tenantId);
        return handler(req, context);
      }
    );
  };
}
