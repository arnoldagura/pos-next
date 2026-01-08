import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { user, userOrganization, organization } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { registerUserSchema } from '@/lib/validations/user';
import { canRegisterToOrganization } from '@/lib/tenant-registration';

/**
 * POST /api/auth/register-with-org
 * Register a new user and assign them to an organization
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, organizationId, roleId } = body;

    const validation = registerUserSchema.safeParse({
      name,
      email,
      password,
      confirmPassword: password,
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.issues },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

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

    if (!canRegisterToOrganization(org)) {
      return NextResponse.json(
        { error: 'This organization is not accepting new registrations' },
        { status: 403 }
      );
    }

    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!result || !result.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const userId = result.user.id;

    let assignedRoleId = roleId;

    if (!assignedRoleId) {
      const { role: roleSchema } = await import('@/drizzle/schema');
      const [defaultRole] = await db
        .select()
        .from(roleSchema)
        .where(eq(roleSchema.name, 'cashier'))
        .limit(1);

      if (!defaultRole) {
        return NextResponse.json(
          { error: 'No default role found. Please contact administrator.' },
          { status: 500 }
        );
      }

      assignedRoleId = defaultRole.id;
    }

    if (!assignedRoleId) {
      return NextResponse.json(
        {
          error: 'Failed to determine user role. Please contact administrator.',
        },
        { status: 500 }
      );
    }

    await db.insert(userOrganization).values({
      userId,
      organizationId,
      roleId: assignedRoleId,
      isDefault: true,
      joinedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: userId,
          name: result.user.name,
          email: result.user.email,
        },
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
