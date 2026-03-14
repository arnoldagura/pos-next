import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { role, userOrganization } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';
import { getTenantId } from '@/lib/tenant-context';

async function assignRolesHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context available' }, { status: 400 });
    }

    const { id: userId } = await context.params;
    const body = await req.json();
    const { roleIds } = body as { roleIds: string[] };

    if (!Array.isArray(roleIds)) {
      return NextResponse.json({ error: 'roleIds must be an array' }, { status: 400 });
    }

    // Verify user belongs to this organization
    const [userInOrg] = await db
      .select({ userId: userOrganization.userId })
      .from(userOrganization)
      .where(
        and(eq(userOrganization.userId, userId), eq(userOrganization.organizationId, tenantId))
      )
      .limit(1);

    if (!userInOrg) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (roleIds.length === 1) {
      await db
        .update(userOrganization)
        .set({ roleId: roleIds[0] })
        .where(
          and(eq(userOrganization.userId, userId), eq(userOrganization.organizationId, tenantId))
        );
    } else if (roleIds.length === 0) {
      return NextResponse.json({ error: 'At least one role must be assigned' }, { status: 400 });
    } else {
      await db
        .update(userOrganization)
        .set({ roleId: roleIds[0] })
        .where(
          and(eq(userOrganization.userId, userId), eq(userOrganization.organizationId, tenantId))
        );
    }

    const updatedRoles = await db
      .select({
        roleId: userOrganization.roleId,
        roleName: role.name,
        roleDescription: role.description,
      })
      .from(userOrganization)
      .innerJoin(role, eq(userOrganization.roleId, role.id))
      .where(
        and(eq(userOrganization.userId, userId), eq(userOrganization.organizationId, tenantId))
      );

    return NextResponse.json({
      roles: updatedRoles.map((r) => ({
        id: r.roleId,
        name: r.roleName,
        description: r.roleDescription,
      })),
    });
  } catch (error) {
    console.error('Error assigning roles:', error);
    return NextResponse.json({ error: 'Failed to assign roles' }, { status: 500 });
  }
}

export const PUT = protectRoute(assignRolesHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.UPDATE,
});
