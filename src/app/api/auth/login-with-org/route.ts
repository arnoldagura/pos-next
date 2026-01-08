import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { user, userOrganization, organization } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/auth/validate-org-access
 * Validates user belongs to organization BEFORE sign-in
 * This is called before the actual better-auth sign-in
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, organizationId } = body;

    if (!email || !organizationId) {
      return NextResponse.json(
        { error: 'Email and organization ID are required' },
        { status: 400 }
      );
    }

    const [userInOrg] = await db
      .select({
        userId: user.id,
        orgId: organization.id,
        orgName: organization.name,
      })
      .from(user)
      .innerJoin(userOrganization, eq(user.id, userOrganization.userId))
      .innerJoin(
        organization,
        eq(userOrganization.organizationId, organization.id)
      )
      .where(and(eq(user.email, email), eq(organization.id, organizationId)))
      .limit(1);

    if (!userInOrg) {
      return NextResponse.json(
        {
          error: 'Invalid email or password.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      hasAccess: true,
    });
  } catch (error) {
    console.error('Organization access validation error:', error);
    return NextResponse.json(
      { error: 'An error occurred during validation' },
      { status: 500 }
    );
  }
}
