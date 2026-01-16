import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import {
  role,
  rolePermission,
  userRole,
  userOrganization,
} from '@/drizzle/schema';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { createRoleSchema } from '@/lib/types/rbac';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { eq, sql, or, and, isNull } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant-context';

async function getRolesHandler() {
  try {
    const tenantId = await getTenantId();

    const roles = await db
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
      .where(
        or(
          eq(role.isGlobal, true),
          tenantId
            ? eq(role.organizationId, tenantId)
            : isNull(role.organizationId)
        )
      );

    const rolesWithCounts = await Promise.all(
      roles.map(async (r) => {
        const [permissionCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(rolePermission)
          .where(eq(rolePermission.roleId, r.id));

        const [orgUserCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(userOrganization)
          .where(
            tenantId
              ? sql`${userOrganization.roleId} = ${r.id} AND ${userOrganization.organizationId} = ${tenantId}`
              : eq(userOrganization.roleId, r.id)
          );

        const [directUserCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(userRole)
          .where(eq(userRole.roleId, r.id));

        const totalUserCount =
          (orgUserCount?.count || 0) + (directUserCount?.count || 0);

        return {
          ...r,
          _count: {
            permissions: permissionCount?.count || 0,
            users: totalUserCount,
          },
        };
      })
    );

    return NextResponse.json({ roles: rolesWithCounts });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

async function createRoleHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createRoleSchema.parse(body);
    const tenantId = await getTenantId();

    const existingRole = await db
      .select()
      .from(role)
      .where(
        and(
          eq(role.name, validatedData.name),
          tenantId
            ? eq(role.organizationId, tenantId)
            : isNull(role.organizationId)
        )
      )
      .limit(1);

    if (existingRole.length > 0) {
      return NextResponse.json(
        { error: 'Role with this name already exists in your organization' },
        { status: 400 }
      );
    }

    const roleId = randomUUID();
    const [newRole] = await db
      .insert(role)
      .values({
        id: roleId,
        name: validatedData.name,
        description: validatedData.description || null,
        organizationId: tenantId,
        isGlobal: false,
      })
      .returning();

    if (validatedData.permissionIds && validatedData.permissionIds.length > 0) {
      const permissionAssignments = validatedData.permissionIds.map(
        (permId) => ({
          roleId,
          permissionId: permId,
        })
      );

      await db.insert(rolePermission).values(permissionAssignments);
    }

    return NextResponse.json(newRole, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating role:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getRolesHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.READ,
});

export const POST = protectRoute(createRoleHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.CREATE,
});
