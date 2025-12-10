import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { materialInventory } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateMaterialInventorySchema = z.object({
  alertThreshold: z
    .number()
    .nonnegative('Alert threshold must be non-negative')
    .optional(),
  unitOfMeasure: z.string().optional(),
});

// GET /api/material-inventories/[id] - Get single material inventory
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventory.id, params.id),
      with: {
        material: {
          with: {
            category: true,
            supplier: true,
          },
        },
        location: true,
        batches: {
          orderBy: (batches, { asc }) => [asc(batches.expiryDate)],
        },
        movements: {
          orderBy: (movements, { desc }) => [desc(movements.date)],
          limit: 50,
        },
      },
    });

    if (!inventory) {
      return NextResponse.json(
        { error: 'Material inventory not found' },
        { status: 404 }
      );
    }

    // Calculate total quantity from batches
    const totalQuantity = inventory.batches.reduce(
      (sum, batch) => sum + parseFloat(batch.quantity),
      0
    );

    return NextResponse.json({
      ...inventory,
      totalQuantity: totalQuantity.toString(),
    });
  } catch (error) {
    console.error('Error fetching material inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material inventory' },
      { status: 500 }
    );
  }
}

// PATCH /api/material-inventories/[id] - Update material inventory
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const validation = updateMaterialInventorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { alertThreshold, unitOfMeasure } = validation.data;

    const updateData: { alertThreshold?: string; unitOfMeasure?: string } = {};

    if (alertThreshold !== undefined) {
      updateData.alertThreshold = alertThreshold.toString();
    }

    if (unitOfMeasure !== undefined) {
      updateData.unitOfMeasure = unitOfMeasure;
    }

    const [updated] = await db
      .update(materialInventory)
      .set(updateData)
      .where(eq(materialInventory.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Material inventory not found' },
        { status: 404 }
      );
    }

    // Fetch updated inventory with relations
    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventory.id, params.id),
      with: {
        material: {
          with: {
            category: true,
            supplier: true,
          },
        },
        location: true,
        batches: true,
      },
    });

    return NextResponse.json(inventory);
  } catch (error) {
    console.error('Error updating material inventory:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update material inventory' },
      { status: 500 }
    );
  }
}

// DELETE /api/material-inventories/[id] - Delete material inventory
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const [deleted] = await db
      .delete(materialInventory)
      .where(eq(materialInventory.id, params.id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: 'Material inventory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting material inventory:', error);
    return NextResponse.json(
      { error: 'Failed to delete material inventory' },
      { status: 500 }
    );
  }
}
