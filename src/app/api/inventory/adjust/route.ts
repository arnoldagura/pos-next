import { db } from '@/db/db';
import { inventory, inventoryMovement } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { adjustmentSchema } from '@/lib/validations/inventory';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  getCurrentStock,
  invalidateInventoryCache,
  invalidateLocationCache,
} from '@/lib/services/inventory-calculation';

export async function adjustStockHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = adjustmentSchema.parse(body);

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

    const currentStockLevel = await getCurrentStock(validatedData.inventoryId);
    const currentStock = currentStockLevel?.currentStock || 0;

    if (validatedData.quantity < 0) {
      const requiredStock = Math.abs(validatedData.quantity);
      if (currentStock < requiredStock) {
        return NextResponse.json(
          {
            error: 'Insufficient stock for adjustment',
            currentStock,
            requested: requiredStock,
            shortfall: requiredStock - currentStock,
          },
          { status: 400 }
        );
      }
    }

    const adjustment = await db
      .insert(inventoryMovement)
      .values({
        id: randomUUID(),
        inventoryId: validatedData.inventoryId,
        type: 'adjustment',
        quantity: Math.abs(validatedData.quantity).toString(),
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
        adjustment: adjustment[0],
        previousStock: currentStock,
        newStock: newStockLevel?.currentStock || 0,
        change: validatedData.quantity,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adjusting stock:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to adjust stock' },
      { status: 500 }
    );
  }
}

// POST /api/inventory/adjust - Stock adjustment
export const POST = protectRoute(adjustStockHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});
