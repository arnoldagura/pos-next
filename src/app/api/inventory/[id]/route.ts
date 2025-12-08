import { db } from '@/db/db';
import {
  inventory,
  inventoryMovement,
  product,
  location,
} from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { updateInventorySchema } from '@/lib/validations/inventory';
import { protectRoute } from '@/middleware/rbac';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentStock } from '@/lib/services/inventory-calculation';

export async function getInventoryByIdHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const inventoryRecord = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: product.name,
        productSku: product.sku,
        productDescription: product.description,
        locationId: inventory.locationId,
        locationName: location.name,
        alertThreshold: inventory.alertThreshold,
        unitOfMeasure: inventory.unitOfMeasure,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(product, eq(inventory.productId, product.id))
      .innerJoin(location, eq(inventory.locationId, location.id))
      .where(eq(inventory.id, id))
      .limit(1);

    if (inventoryRecord.length === 0) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      );
    }

    const stockLevel = await getCurrentStock(id);

    const movements = await db
      .select()
      .from(inventoryMovement)
      .where(eq(inventoryMovement.inventoryId, id))
      .orderBy(desc(inventoryMovement.date))
      .limit(50);

    return NextResponse.json({
      ...inventoryRecord[0],
      currentStock: stockLevel?.currentStock || 0,
      movements,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);

    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function updateInventoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateInventorySchema.parse(body);

    const existingInventory = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);

    if (existingInventory.length === 0) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, string | undefined> = {};

    if (validatedData.alertThreshold !== undefined) {
      updateData.alertThreshold = validatedData.alertThreshold.toString();
    }

    if (validatedData.unitOfMeasure !== undefined) {
      updateData.unitOfMeasure = validatedData.unitOfMeasure;
    }

    const updatedInventory = await db
      .update(inventory)
      .set(updateData)
      .where(eq(inventory.id, id))
      .returning();

    return NextResponse.json(updatedInventory[0]);
  } catch (error) {
    console.error('Error updating inventory:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

export async function deleteInventoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const existingInventory = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, id))
      .limit(1);

    if (existingInventory.length === 0) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      );
    }

    await db.delete(inventory).where(eq(inventory.id, id));

    return NextResponse.json({ message: 'Inventory deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory:', error);

    return NextResponse.json(
      { error: 'Failed to delete inventory' },
      { status: 500 }
    );
  }
}

// GET /api/inventory/[id] - Get single inventory with movements
export const GET = protectRoute(getInventoryByIdHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});

// PATCH /api/inventory/[id] - Update inventory record
export const PATCH = protectRoute(updateInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});

// DELETE /api/inventory/[id] - Delete inventory record
export const DELETE = protectRoute(deleteInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.DELETE,
});
