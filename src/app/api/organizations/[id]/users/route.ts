import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organization, userOrganization, user, role } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { z } from 'zod';

const addUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
  isDefault: z.boolean().optional().default(false),
});

/**
 * GET /api/organizations/:id/users
 * Get all users in an organization (super admin only)
 */
async function getOrganizationUsersHandler(
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  try {
    if (!context?.params) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const params = await context.params;

    // Check if organization exists
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, params.id),
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get users in this organization
    const orgUsers = await db
      .select({
        userId: userOrganization.userId,
        organizationId: userOrganization.organizationId,
        roleId: userOrganization.roleId,
        isDefault: userOrganization.isDefault,
        joinedAt: userOrganization.joinedAt,
        lastAccessedAt: userOrganization.lastAccessedAt,
        userName: user.name,
        userEmail: user.email,
        userImage: user.image,
        roleName: role.name,
      })
      .from(userOrganization)
      .innerJoin(user, eq(userOrganization.userId, user.id))
      .innerJoin(role, eq(userOrganization.roleId, role.id))
      .where(eq(userOrganization.organizationId, params.id));

    const formattedUsers = orgUsers.map((u) => ({
      userId: u.userId,
      name: u.userName,
      email: u.userEmail,
      image: u.userImage,
      role: {
        id: u.roleId,
        name: u.roleName,
      },
      isDefault: u.isDefault,
      joinedAt: u.joinedAt,
      lastAccessedAt: u.lastAccessedAt,
    }));

    return NextResponse.json({
      users: formattedUsers,
      organizationId: params.id,
      organizationName: org.name,
    });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations/:id/users
 * Add a user to an organization (super admin only)
 */
async function addUserToOrganizationHandler(
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  try {
    if (!context?.params) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const params = await context.params;
    const body = await req.json();
    const validatedData = addUserSchema.parse(body);

    // Check if organization exists
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, params.id),
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check if user exists
    const existingUser = await db.query.user.findFirst({
      where: eq(user.id, validatedData.userId),
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if role exists
    const existingRole = await db.query.role.findFirst({
      where: eq(role.id, validatedData.roleId),
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Check if user is already in the organization
    const existingAssignment = await db.query.userOrganization.findFirst({
      where: and(
        eq(userOrganization.userId, validatedData.userId),
        eq(userOrganization.organizationId, params.id)
      ),
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    // Add user to organization
    const [assignment] = await db
      .insert(userOrganization)
      .values({
        userId: validatedData.userId,
        organizationId: params.id,
        roleId: validatedData.roleId,
        isDefault: validatedData.isDefault,
        joinedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: 'User added to organization successfully',
        assignment,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding user to organization:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: (error as unknown as { errors: unknown }).errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to add user to organization' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/:id/users/:userId
 * Remove a user from an organization (super admin only)
 */
async function removeUserFromOrganizationHandler(
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  try {
    if (!context?.params) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const params = await context.params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const existingAssignment = await db.query.userOrganization.findFirst({
      where: and(
        eq(userOrganization.userId, userId),
        eq(userOrganization.organizationId, params.id)
      ),
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 404 }
      );
    }

    // Remove user from organization
    await db
      .delete(userOrganization)
      .where(
        and(
          eq(userOrganization.userId, userId),
          eq(userOrganization.organizationId, params.id)
        )
      );

    return NextResponse.json({
      message: 'User removed from organization successfully',
    });
  } catch (error) {
    console.error('Error removing user from organization:', error);
    return NextResponse.json(
      { error: 'Failed to remove user from organization' },
      { status: 500 }
    );
  }
}

// Protect routes with super admin permission
export const GET = protectRoute(getOrganizationUsersHandler, {
  requireSuperAdmin: true,
});

export const POST = protectRoute(addUserToOrganizationHandler, {
  requireSuperAdmin: true,
});

export const DELETE = protectRoute(removeUserFromOrganizationHandler, {
  requireSuperAdmin: true,
});
