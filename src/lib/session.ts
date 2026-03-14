import { auth } from './auth';
import { headers } from 'next/headers';
import { cache } from 'react';
import { db } from '@/db/db';
import { userOrganization, organization, role } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Extended session with tenant context
 */
export interface SessionWithTenant {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
    currentOrganizationId: string | null;
    organizations: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
      isDefault: boolean;
    }>;
    isSuperAdmin: boolean;
  };
  session: {
    id: string;
    expiresAt: Date;
    token: string;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
  };
}

/**
 * Get the current session with tenant context (server-side only)
 * Cached per request to avoid multiple database calls
 */
export const getSession = cache(async (): Promise<SessionWithTenant | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  // Check if super admin (has global super_admin role)
  const { hasRole } = await import('./rbac');
  const isSuperAdmin = await hasRole(session.user.id, 'super_admin');

  // Get user's organizations and roles
  let userOrgs: Array<{
    id: string;
    name: string;
    slug: string;
    roleName: string;
    isDefault: boolean;
  }> = [];

  if (isSuperAdmin) {
    // Super admins can access ALL organizations
    const allOrgs = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(organization)
      .orderBy(organization.name);

    userOrgs = allOrgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      roleName: 'super_admin',
      isDefault: false,
    }));
  } else {
    // Regular users only see their assigned organizations
    userOrgs = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        roleName: role.name,
        isDefault: userOrganization.isDefault,
      })
      .from(userOrganization)
      .innerJoin(organization, eq(userOrganization.organizationId, organization.id))
      .innerJoin(role, eq(userOrganization.roleId, role.id))
      .where(eq(userOrganization.userId, session.user.id));
  }

  // Get current org from cookie or use default
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const currentOrgId =
    cookieStore.get('currentOrganizationId')?.value ||
    userOrgs.find((o) => o.isDefault)?.id ||
    userOrgs[0]?.id ||
    null;

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      image: session.user.image ?? null,
      createdAt: session.user.createdAt,
      updatedAt: session.user.updatedAt,
      currentOrganizationId: currentOrgId,
      organizations: userOrgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        role: org.roleName,
        isDefault: org.isDefault,
      })),
      isSuperAdmin,
    },
    session: {
      id: session.session.id,
      expiresAt: session.session.expiresAt,
      token: session.session.token,
      ipAddress: session.session.ipAddress ?? null,
      userAgent: session.session.userAgent ?? null,
      userId: session.session.userId,
    },
  };
});

/**
 * Require authentication - throws if not authenticated
 * Use in server components and route handlers
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Get current user (server-side only)
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user ?? null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated() {
  const session = await getSession();
  return !!session;
}
