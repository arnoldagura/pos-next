import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { user, role as roleTable, userOrganization } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';
import { getTenantId } from '@/lib/tenant-context';

async function getUserHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    const [userInOrg] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .innerJoin(userOrganization, eq(user.id, userOrganization.userId))
      .where(
        and(eq(user.id, id), eq(userOrganization.organizationId, tenantId))
      )
      .limit(1);

    if (!userInOrg) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roles = await db
      .select({
        roleId: userOrganization.roleId,
        roleName: roleTable.name,
        roleDescription: roleTable.description,
      })
      .from(userOrganization)
      .innerJoin(roleTable, eq(userOrganization.roleId, roleTable.id))
      .where(
        and(
          eq(userOrganization.userId, id),
          eq(userOrganization.organizationId, tenantId)
        )
      );

    return NextResponse.json({
      ...userInOrg,
      roles: roles.map((r) => ({
        id: r.roleId,
        name: r.roleName,
        description: r.roleDescription,
      })),
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

async function updateUserHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    const [userInOrg] = await db
      .select({ userId: userOrganization.userId })
      .from(userOrganization)
      .where(
        and(
          eq(userOrganization.userId, id),
          eq(userOrganization.organizationId, tenantId)
        )
      )
      .limit(1);

    if (!userInOrg) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, emailVerified } = body;

    const [updatedUser] = await db
      .update(user)
      .set({
        name,
        email,
        emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

async function deleteUserHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const { id } = await context.params;

    // Verify user belongs to this organization
    const [userInOrg] = await db
      .select({ userId: userOrganization.userId })
      .from(userOrganization)
      .where(
        and(
          eq(userOrganization.userId, id),
          eq(userOrganization.organizationId, tenantId)
        )
      )
      .limit(1);

    if (!userInOrg) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await db
      .delete(userOrganization)
      .where(
        and(
          eq(userOrganization.userId, id),
          eq(userOrganization.organizationId, tenantId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getUserHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.READ,
});

export const PATCH = protectRoute(updateUserHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.UPDATE,
});

export const DELETE = protectRoute(deleteUserHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.DELETE,
});
