import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import {
  role,
  permission,
  rolePermission,
  userRole,
  userOrganization,
} from '@/drizzle/schema';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { updateRoleSchema } from '@/lib/types/rbac';
import { ZodError } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';

async function getRoleHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [foundRole] = await db
      .select({
        id: role.id,
        name: role.name,
        description: role.description,
        organizationId: role.organizationId,
        isGlobal: role.isGlobal,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      })
      .from(role)
      .where(eq(role.id, id))
      .limit(1);

    if (!foundRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const permissions = await db
      .select({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
        organizationId: permission.organizationId,
        isGlobal: permission.isGlobal,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
      })
      .from(rolePermission)
      .innerJoin(permission, eq(rolePermission.permissionId, permission.id))
      .where(eq(rolePermission.roleId, id));

    const [orgUserCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userOrganization)
      .where(eq(userOrganization.roleId, id));

    const [directUserCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRole)
      .where(eq(userRole.roleId, id));

    const totalUserCount =
      (orgUserCount?.count || 0) + (directUserCount?.count || 0);

    return NextResponse.json({
      ...foundRole,
      permissions,
      _count: {
        permissions: permissions.length,
        users: totalUserCount,
      },
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

async function updateRoleHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateRoleSchema.parse(body);

    const [existingRole] = await db
      .select()
      .from(role)
      .where(eq(role.id, id))
      .limit(1);

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    if (validatedData.name && validatedData.name !== existingRole.name) {
      const [nameConflict] = await db
        .select()
        .from(role)
        .where(eq(role.name, validatedData.name))
        .limit(1);

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Role with this name already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, string | Date | null> = {
      updatedAt: new Date(),
    };
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.description !== undefined)
      updateData.description = validatedData.description || null;

    const [updatedRole] = await db
      .update(role)
      .set(updateData)
      .where(eq(role.id, id))
      .returning();

    if (validatedData.permissionIds !== undefined) {
      await db.delete(rolePermission).where(eq(rolePermission.roleId, id));

      if (validatedData.permissionIds.length > 0) {
        const permissionAssignments = validatedData.permissionIds.map(
          (permId) => ({
            roleId: id,
            permissionId: permId,
          })
        );
        await db.insert(rolePermission).values(permissionAssignments);
      }
    }

    return NextResponse.json(updatedRole);
  } catch (error: unknown) {
    console.error('Error updating role:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

async function deleteRoleHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [existingRole] = await db
      .select()
      .from(role)
      .where(eq(role.id, id))
      .limit(1);

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const [orgUserCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userOrganization)
      .where(eq(userOrganization.roleId, id));

    const [directUserCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRole)
      .where(eq(userRole.roleId, id));

    const totalUserCount =
      (orgUserCount?.count || 0) + (directUserCount?.count || 0);

    if (totalUserCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role. It is assigned to ${totalUserCount} user(s). Please reassign users first.`,
        },
        { status: 400 }
      );
    }

    await db.delete(role).where(eq(role.id, id));

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getRoleHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.READ,
});

export const PATCH = protectRoute(updateRoleHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.UPDATE,
});

export const DELETE = protectRoute(deleteRoleHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.DELETE,
});
