import { db } from '@/db/db';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { adjustmentSchema } from '@/lib/validations/product';
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
import { productInventory, productInventoryMovement } from '@/drizzle/schema';

export async function adjustStockHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = adjustmentSchema.parse(body);

    const productInventoryRecord = await db
      .select()
      .from(productInventory)
      .where(eq(productInventory.id, validatedData.productInventoryId))
      .limit(1);

    if (productInventoryRecord.length === 0) {
      return NextResponse.json({ error: 'Product Inventory not found' }, { status: 404 });
    }

    const currentStockLevel = await getCurrentStock(validatedData.productInventoryId);
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
      .insert(productInventoryMovement)
      .values({
        id: randomUUID(),
        productInventoryId: validatedData.productInventoryId,
        type: 'adjustment',
        quantity: Math.abs(validatedData.quantity).toString(),
        date: new Date(),
        remarks: validatedData.remarks,
        createdBy: validatedData.createdBy,
      })
      .returning();

    invalidateInventoryCache(validatedData.productInventoryId);
    invalidateLocationCache(productInventoryRecord[0].locationId);

    const newStockLevel = await getCurrentStock(validatedData.productInventoryId);

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

    return NextResponse.json({ error: 'Failed to adjust stock' }, { status: 500 });
  }
}

// POST /api/product-inventories/adjust - Stock adjustment
export const POST = protectRoute(adjustStockHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});
