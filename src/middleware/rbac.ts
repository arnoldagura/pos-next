import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasAnyRole, can } from '@/lib/rbac';

/**
 * Middleware to protect routes by requiring specific roles
 * @param requiredRoles - Array of role names that are allowed access
 * @returns Middleware function
 */
export function requireRole(...requiredRoles: string[]) {
  return async (req: NextRequest) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

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
  return async (req: NextRequest) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

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
 * Higher-order function to protect API route handlers
 * @param handler - The API route handler
 * @param options - Protection options (roles or permission)
 * @returns Protected handler
 */
export function protectRoute<T>(
  handler: (req: NextRequest, context?: T) => Promise<Response>,
  options:
    | { roles: string[] }
    | { resource: string; action: string }
    | { check: (userId: string) => Promise<boolean> },
) {
  return async (req: NextRequest, context?: T) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let hasAccess = false;

    if ('roles' in options) {
      hasAccess = await hasAnyRole(session.user.id, options.roles);
    } else if ('resource' in options && 'action' in options) {
      hasAccess = await can(session.user.id, options.resource, options.action);
    } else if ('check' in options) {
      hasAccess = await options.check(session.user.id);
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return handler(req, context);
  };
}
