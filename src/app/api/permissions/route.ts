import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { permission } from '@/drizzle/schema';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { createPermissionSchema } from '@/lib/types/rbac';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { eq, or, isNull } from 'drizzle-orm';
import { getTenantId } from '@/lib/tenant-context';

async function getPermissionsHandler() {
  try {
    const tenantId = await getTenantId();

    // Get permissions for current tenant (or global permissions)
    // Global permissions (isGlobal=true) are available to all tenants
    // Tenant-specific permissions are only visible to that tenant
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
      .from(permission)
      .where(
        or(
          eq(permission.isGlobal, true),
          tenantId
            ? eq(permission.organizationId, tenantId)
            : isNull(permission.organizationId)
        )
      );

    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

async function createPermissionHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createPermissionSchema.parse(body);

    // Check if permission name already exists
    const existingPermission = await db
      .select()
      .from(permission)
      .where(eq(permission.name, validatedData.name))
      .limit(1);

    if (existingPermission.length > 0) {
      return NextResponse.json(
        { error: 'Permission with this name already exists' },
        { status: 400 }
      );
    }

    // Create the permission
    const [newPermission] = await db
      .insert(permission)
      .values({
        id: randomUUID(),
        name: validatedData.name,
        description: validatedData.description || null,
        resource: validatedData.resource,
        action: validatedData.action,
        organizationId: null,
        isGlobal: false,
      })
      .returning();

    return NextResponse.json(newPermission, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating permission:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getPermissionsHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.READ,
});

export const POST = protectRoute(createPermissionHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.CREATE,
});
