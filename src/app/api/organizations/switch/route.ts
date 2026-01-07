import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db/db';
import { userOrganization, organization } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { hasRole } from '@/lib/rbac';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Check if user is super admin
    const isSuperAdmin = await hasRole(session.user.id, 'super_admin');

    if (isSuperAdmin) {
      // Super admin can switch to any organization
      // Verify the organization exists
      const [org] = await db
        .select()
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);

      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        );
      }
    } else {
      // Regular users can only switch to organizations they belong to
      const [userOrg] = await db
        .select()
        .from(userOrganization)
        .where(
          and(
            eq(userOrganization.userId, session.user.id),
            eq(userOrganization.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!userOrg) {
        return NextResponse.json(
          { error: 'You do not have access to this organization' },
          { status: 403 }
        );
      }
    }

    // Set the organization cookie
    const cookieStore = await cookies();
    cookieStore.set('currentOrganizationId', organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    return NextResponse.json({
      success: true,
      organizationId,
    });
  } catch (error) {
    console.error('Error switching organization:', error);
    return NextResponse.json(
      { error: 'Failed to switch organization' },
      { status: 500 }
    );
  }
}
