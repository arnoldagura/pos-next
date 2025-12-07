import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { restaurantTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { updateTableStatusSchema } from '@/lib/validations';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';
import { ZodError } from 'zod';

async function updateTableStatusHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateTableStatusSchema.parse(body);

    // First check if table exists
    const [existingTable] = await db
      .select()
      .from(restaurantTable)
      .where(eq(restaurantTable.id, id))
      .limit(1);

    if (!existingTable) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // Update only the status
    const [updatedTable] = await db
      .update(restaurantTable)
      .set({
        status: validatedData.status,
        updatedAt: new Date(),
      })
      .where(eq(restaurantTable.id, id))
      .returning();

    return NextResponse.json(updatedTable);
  } catch (error: unknown) {
    console.error('Error updating table status:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update table status' },
      { status: 500 }
    );
  }
}

// PATCH /api/tables/:id/status - Update table status
export const PATCH = protectRoute(updateTableStatusHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});
