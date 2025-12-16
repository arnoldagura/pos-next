import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import {
  materialInventory,
  materialBatch,
  materialInventoryMovement,
} from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getMaterialCurrentStock } from '@/lib/services/material-inventory-calculation';

const addBatchSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  quantity: z.number().positive('Quantity must be positive'),
  cost: z.number().nonnegative('Cost must be non-negative'),
  expiryDate: z.string().optional(),
  remarks: z.string().optional(),
  createdBy: z.string().optional(),
});

// POST /api/material-inventories/[id]/add-batch - Add new batch to inventory
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const body = await request.json();

    const validation = addBatchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { batchNumber, quantity, cost, expiryDate, remarks, createdBy } =
      validation.data;

    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventory.id, id),
    });

    if (!inventory) {
      return NextResponse.json(
        { error: 'Material inventory not found' },
        { status: 404 }
      );
    }

    const [newBatch] = await db
      .insert(materialBatch)
      .values({
        id: randomUUID(),
        materialInventoryId: id,
        batchNumber,
        quantity: quantity.toString(),
        cost: cost.toString(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        remarks: remarks || null,
      })
      .returning();

    await db.insert(materialInventoryMovement).values({
      id: randomUUID(),
      materialInventoryId: id,
      batchId: newBatch.id,
      type: 'purchase',
      quantity: quantity.toString(),
      unitPrice: (cost / quantity).toString(),
      date: new Date(),
      remarks: remarks || `Added batch ${batchNumber}`,
      createdBy,
    });

    const stockLevel = await getMaterialCurrentStock(id);
    await db
      .update(materialInventory)
      .set({
        currentQuantity: stockLevel?.currentStock.toString() ?? '0.00',
      })
      .where(eq(materialInventory.id, id))
      .returning();

    return NextResponse.json(newBatch, { status: 201 });
  } catch (error) {
    console.error('Error adding batch:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to add batch' }, { status: 500 });
  }
}
