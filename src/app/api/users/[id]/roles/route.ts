import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { userRole, role } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';

async function assignRolesHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id: userId } = await context.params;
    const body = await req.json();
    const { roleIds } = body as { roleIds: string[] };

    if (!Array.isArray(roleIds)) {
      return NextResponse.json(
        { error: 'roleIds must be an array' },
        { status: 400 }
      );
    }

    await db.delete(userRole).where(eq(userRole.userId, userId));

    if (roleIds.length > 0) {
      await db.insert(userRole).values(
        roleIds.map((roleId) => ({
          userId,
          roleId,
        }))
      );
    }

    const updatedRoles = await db
      .select({
        roleId: userRole.roleId,
        roleName: role.name,
        roleDescription: role.description,
      })
      .from(userRole)
      .innerJoin(role, eq(userRole.roleId, role.id))
      .where(eq(userRole.userId, userId));

    return NextResponse.json({
      roles: updatedRoles.map((r) => ({
        id: r.roleId,
        name: r.roleName,
        description: r.roleDescription,
      })),
    });
  } catch (error) {
    console.error('Error assigning roles:', error);
    return NextResponse.json(
      { error: 'Failed to assign roles' },
      { status: 500 }
    );
  }
}

export const PUT = protectRoute(assignRolesHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.UPDATE,
});
