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

    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventory.id, validatedData.materialInventoryId),
    });

    if (!inventory) {
      return NextResponse.json(
        { error: 'Material inventory not found' },
        { status: 404 }
      );
    }

    // Use provided unitPrice or fallback to current inventory cost
    const finalUnitPrice = validatedData.unitPrice ?? Number(inventory.cost || 0);
    const unitPrice = finalUnitPrice.toFixed(2);

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
