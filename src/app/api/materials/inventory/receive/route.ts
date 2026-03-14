import { db } from '@/db/db';
import { materialInventoryMovement, materialInventory, materialBatch } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { receiveMaterialSchema } from '@/lib/validations/material';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function receiveMaterialHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = receiveMaterialSchema.parse(body);

    const inventoryExists = await db
      .select()
      .from(materialInventory)
      .where(eq(materialInventory.id, validatedData.materialInventoryId))
      .limit(1);

    if (inventoryExists.length === 0) {
      return NextResponse.json({ error: 'Material inventory not found' }, { status: 404 });
    }

    const result = await db.transaction(async (tx) => {
      const batchId = randomUUID();
      const movementId = randomUUID();

      const expiryDate = validatedData.expiryDate ? new Date(validatedData.expiryDate) : null;

      const [newBatch] = await tx
        .insert(materialBatch)
        .values({
          id: batchId,
          materialInventoryId: validatedData.materialInventoryId,
          batchNumber: validatedData.batchNumber,
          expiryDate,
          quantity: validatedData.quantity.toString(),
          cost: validatedData.cost.toString(),
        })
        .returning();

      const [newMovement] = await tx
        .insert(materialInventoryMovement)
        .values({
          id: movementId,
          materialInventoryId: validatedData.materialInventoryId,
          batchId: batchId,
          type: 'purchase',
          quantity: validatedData.quantity.toString(),
          unitPrice: validatedData.cost.toString(),
          date: new Date(),
          remarks: validatedData.remarks,
          referenceType: validatedData.referenceType,
          referenceId: validatedData.referenceId,
          createdBy: validatedData.createdBy,
        })
        .returning();

      return { batch: newBatch, movement: newMovement };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error receiving material:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to receive material' }, { status: 500 });
  }
}

export const POST = protectRoute(receiveMaterialHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.CREATE,
});
