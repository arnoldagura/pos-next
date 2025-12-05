import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { user, userRole, role as roleTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getUserHandler(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const [foundUser] = await db
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
      .where(eq(user.id, id))
      .limit(1);

    if (!foundUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roles = await db
      .select({
        roleId: userRole.roleId,
        roleName: roleTable.name,
        roleDescription: roleTable.description,
      })
      .from(userRole)
      .innerJoin(roleTable, eq(userRole.roleId, roleTable.id))
      .where(eq(userRole.userId, id));

    return NextResponse.json({
      ...foundUser,
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

async function updateUserHandler(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
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

async function deleteUserHandler(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const [deletedUser] = await db
      .delete(user)
      .where(eq(user.id, id))
      .returning({ id: user.id });

    if (!deletedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
