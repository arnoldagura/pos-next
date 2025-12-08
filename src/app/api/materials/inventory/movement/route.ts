import { db } from '@/db/db';
import { materialInventoryMovement, materialInventory } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { createMaterialMovementSchema } from '@/lib/validations/material';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function createMaterialMovementHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createMaterialMovementSchema.parse(body);

    const inventoryExists = await db
      .select()
      .from(materialInventory)
      .where(eq(materialInventory.id, validatedData.materialInventoryId))
      .limit(1);

    if (inventoryExists.length === 0) {
      return NextResponse.json(
        { error: 'Material inventory not found' },
        { status: 404 }
      );
    }

    const unitPrice = validatedData.unitPrice
      ? validatedData.unitPrice.toString()
      : null;

    const quantity = validatedData.quantity.toString();

    const date = validatedData.date ? new Date(validatedData.date) : new Date();

    const newMovement = await db
      .insert(materialInventoryMovement)
      .values({
        id: randomUUID(),
        materialInventoryId: validatedData.materialInventoryId,
        batchId: validatedData.batchId || null,
        type: validatedData.type,
        quantity,
        unitPrice,
        date,
        remarks: validatedData.remarks,
        referenceType: validatedData.referenceType,
        referenceId: validatedData.referenceId,
        createdBy: validatedData.createdBy,
      })
      .returning();

    return NextResponse.json(newMovement[0], { status: 201 });
  } catch (error) {
    console.error('Error creating material movement:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create material movement' },
      { status: 500 }
    );
  }
}

export const POST = protectRoute(createMaterialMovementHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.CREATE,
});
