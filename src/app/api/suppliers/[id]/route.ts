import { db } from '@/db/db';
import { supplier } from '@/drizzle/schema/suppliers';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { updateSupplierSchema } from '@/lib/validations/supplier';
import { protectRoute } from '@/middleware/rbac';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

async function getSupplierHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [foundSupplier] = await db
      .select()
      .from(supplier)
      .where(eq(supplier.id, id))
      .limit(1);
    if (!foundSupplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(foundSupplier);
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

async function updateSupplierHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateSupplierSchema.parse(body);

    const [updatedSupplier] = await db
      .update(supplier)
      .set({ ...validatedData, updatedAt: new Date() })
      .where(eq(supplier.id, id))
      .returning();

    if (!updatedSupplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedSupplier);
  } catch (error) {
    console.error('Error updating location:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.cause },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

async function deleteSupplierHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [deletedSupplier] = await db
      .delete(supplier)
      .where(eq(supplier.id, id))
      .returning({ id: supplier.id });

    if (!deletedSupplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}

// GET /api/suppliers/:id - Get supplier by ID
export const GET = protectRoute(getSupplierHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});

// PATCH /api/suppliers/:id - Update supplier by ID
export const PATCH = protectRoute(updateSupplierHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});

// DELETE /api/suppliers/:id - Delete supplier by ID
export const DELETE = protectRoute(deleteSupplierHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.DELETE,
});
