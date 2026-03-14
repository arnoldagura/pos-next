import { db } from '@/db/db';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { createMovementSchema } from '@/lib/validations/product';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  validateStockAvailability,
  invalidateInventoryCache,
  invalidateLocationCache,
} from '@/lib/services/inventory-calculation';
import { productInventory, productInventoryMovement } from '@/drizzle/schema';

export async function createMovementHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createMovementSchema.parse(body);

    const productInventoryRecord = await db
      .select()
      .from(productInventory)
      .where(eq(productInventory.id, validatedData.productInventoryId))
      .limit(1);

    if (productInventoryRecord.length === 0) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    const decreaseTypes = ['sale', 'transfer_out', 'waste'];
    if (decreaseTypes.includes(validatedData.type)) {
      const validation = await validateStockAvailability(
        validatedData.productInventoryId,
        validatedData.quantity
      );

      if (!validation.available) {
        return NextResponse.json(
          {
            error: 'Insufficient stock',
            currentStock: validation.currentStock,
            requested: validation.requestedQuantity,
            shortfall: validation.shortfall,
          },
          { status: 400 }
        );
      }
    }

    const movementDate = validatedData.date ? new Date(validatedData.date) : new Date();

    const newMovement = await db
      .insert(productInventoryMovement)
      .values({
        id: randomUUID(),
        productInventoryId: validatedData.productInventoryId,
        type: validatedData.type,
        quantity: validatedData.quantity.toString(),
        unitPrice: validatedData.unitPrice?.toString(),
        date: movementDate,
        remarks: validatedData.remarks,
        referenceType: validatedData.referenceType,
        referenceId: validatedData.referenceId,
        createdBy: validatedData.createdBy,
      })
      .returning();

    invalidateInventoryCache(validatedData.productInventoryId);
    invalidateLocationCache(productInventoryRecord[0].locationId);

    return NextResponse.json(newMovement[0], { status: 201 });
  } catch (error) {
    console.error('Error creating movement:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 });
  }
}

// POST /api/product-inventories/movement - Record movement
export const POST = protectRoute(createMovementHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});
