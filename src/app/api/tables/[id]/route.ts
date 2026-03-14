import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { restaurantTable } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { updateTableSchema } from '@/lib/validations';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';
import { ZodError } from 'zod';
import { requireTenantId } from '@/lib/tenant-context';

async function getTableHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const [foundTable] = await db
      .select()
      .from(restaurantTable)
      .where(and(eq(restaurantTable.id, id), eq(restaurantTable.organizationId, tenantId)))
      .limit(1);

    if (!foundTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json(foundTable);
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json({ error: 'Failed to fetch table' }, { status: 500 });
  }
}

async function updateTableHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateTableSchema.parse(body);

    const [updatedTable] = await db
      .update(restaurantTable)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(eq(restaurantTable.id, id), eq(restaurantTable.organizationId, tenantId)))
      .returning();

    if (!updatedTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json(updatedTable);
  } catch (error: unknown) {
    console.error('Error updating table:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 });
  }
}

async function deleteTableHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [deletedTable] = await db
      .delete(restaurantTable)
      .where(eq(restaurantTable.id, id))
      .returning({ id: restaurantTable.id });

    if (!deletedTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}

// GET /api/tables/:id - Get table by ID
export const GET = protectRoute(getTableHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.READ,
});

// PATCH /api/tables/:id - Update table by ID
export const PATCH = protectRoute(updateTableHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});

// DELETE /api/tables/:id - Delete table by ID
export const DELETE = protectRoute(deleteTableHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});
