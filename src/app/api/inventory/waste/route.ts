import { db } from '@/db/db';
import { inventory, inventoryMovement } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { wasteSchema } from '@/lib/validations/inventory';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  validateStockAvailability,
  getCurrentStock,
  invalidateInventoryCache,
  invalidateLocationCache,
} from '@/lib/services/inventory-calculation';

export async function recordWasteHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = wasteSchema.parse(body);

    const inventoryRecord = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, validatedData.inventoryId))
      .limit(1);

    if (inventoryRecord.length === 0) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      );
    }

    const validation = await validateStockAvailability(
      validatedData.inventoryId,
      validatedData.quantity
    );

    if (!validation.available) {
      return NextResponse.json(
        {
          error: 'Insufficient stock to record waste',
          currentStock: validation.currentStock,
          requested: validation.requestedQuantity,
          shortfall: validation.shortfall,
        },
        { status: 400 }
      );
    }

    const currentStockLevel = await getCurrentStock(validatedData.inventoryId);
    const currentStock = currentStockLevel?.currentStock || 0;

    const waste = await db
      .insert(inventoryMovement)
      .values({
        id: randomUUID(),
        inventoryId: validatedData.inventoryId,
        type: 'waste',
        quantity: validatedData.quantity.toString(),
        date: new Date(),
        remarks: validatedData.remarks,
        createdBy: validatedData.createdBy,
      })
      .returning();

    invalidateInventoryCache(validatedData.inventoryId);
    invalidateLocationCache(inventoryRecord[0].locationId);

    const newStockLevel = await getCurrentStock(validatedData.inventoryId);

    return NextResponse.json(
      {
        waste: waste[0],
        previousStock: currentStock,
        newStock: newStockLevel?.currentStock || 0,
        wasteQuantity: validatedData.quantity,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error recording waste:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to record waste' },
      { status: 500 }
    );
  }
}

// POST /api/inventory/waste - Record waste
export const POST = protectRoute(recordWasteHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});
