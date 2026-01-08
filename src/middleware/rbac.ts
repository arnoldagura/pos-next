import { NextRequest, NextResponse } from 'next/server';
import { hasAnyRole, can, hasAnyRoleInTenant, canInTenant } from '@/lib/rbac';
import { getTenantId } from '@/lib/tenant-context';
import { getSession } from '@/lib/session';
import { tenantAsyncContext } from '@/lib/tenant-async-context';

/**
 * Middleware to protect routes by requiring specific roles
 * @param requiredRoles - Array of role names that are allowed access
 * @returns Middleware function
 */
export function requireRole(...requiredRoles: string[]) {
  return async () => {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasAnyRole(session.user.id, requiredRoles);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.next();
  };
}

/**
 * Middleware to protect routes by requiring specific permissions
 * @param resource - The resource name
 * @param action - The action to perform
 * @returns Middleware function
 */
export function requirePermission(resource: string, action: string) {
  return async () => {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await can(session.user.id, resource, action);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.next();
  };
}

/**
 * Higher-order function to protect API route handlers with tenant awareness
 * @param handler - The API route handler
 * @param options - Protection options (roles, permission, requireSuperAdmin, or custom check)
 * @returns Protected handler
 */
export function protectRoute<T>(
  handler: (req: NextRequest, context?: T) => Promise<Response>,
  options:
    | { roles: string[] }
    | { resource: string; action: string }
    | { requireSuperAdmin: boolean }
    | {
        check: (
          userId: string,
          organizationId: string | null
        ) => Promise<boolean>;
      }
) {
  return async (req: NextRequest, context?: T) => {
    // Use extended session with pre-computed isSuperAdmin
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID using centralized tenant context logic
    // This handles super admin sidebar selection, cookies, and headers
    const tenantId: string | null = await getTenantId();

    // Check for super admin requirement
    if ('requireSuperAdmin' in options && options.requireSuperAdmin) {
      // Use pre-computed isSuperAdmin from session (no extra DB query)
      if (!session.user.isSuperAdmin) {
        return NextResponse.json(
          { error: 'Super admin access required' },
          { status: 403 }
        );
      }

      // Use AsyncLocalStorage for tenant context (safer than header mutation)
      if (tenantId) {
        return tenantAsyncContext.run(
          {
            tenantId,
            userId: session.user.id,
            isSuperAdmin: true,
          },
          () => {
            // Also set header for backward compatibility
            req.headers.set('x-tenant-id', tenantId);
            return handler(req, context);
          }
        );
      }

      return handler(req, context);
    }

    // Require tenant context for non-super-admin routes
    if (!tenantId) {
      return NextResponse.json(
        {
          error:
            'No tenant context available. Please contact your administrator.',
        },
        { status: 400 }
      );
    }

    let hasAccess = false;

    // Check permissions based on options
    if ('roles' in options) {
      hasAccess = await hasAnyRoleInTenant(
        session.user.id,
        options.roles,
        tenantId
      );
    } else if ('resource' in options && 'action' in options) {
      hasAccess = await canInTenant(
        session.user.id,
        options.resource,
        options.action,
        tenantId
      );
    } else if ('check' in options) {
      hasAccess = await options.check(session.user.id, tenantId);
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use AsyncLocalStorage for tenant context (safer than header mutation)
    // Also set header for backward compatibility
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
