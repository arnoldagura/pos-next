import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { materialInventory } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateMaterialInventorySchema = z.object({
  variantName: z.string().optional().nullable(),
  sku: z.string().optional(),
  defaultSupplierId: z.string().optional().nullable(),
  unitOfMeasure: z.string().optional(),
  cost: z.number().min(0).optional(),
  alertThreshold: z
    .number()
    .nonnegative('Alert threshold must be non-negative')
    .optional(),
});

// GET /api/material-inventories/[id] - Get single material inventory
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventory.id, id),
      with: {
        material: {
          with: {
            category: true,
          },
        },
        supplier: true,
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const validation = updateMaterialInventorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      variantName,
      sku,
      defaultSupplierId,
      unitOfMeasure,
      cost,
      alertThreshold,
    } = validation.data;

    const updateData: Partial<typeof materialInventory.$inferInsert> = {};

    if (variantName !== undefined) {
      updateData.variantName = variantName;
    }

    if (sku !== undefined) {
      updateData.sku = sku || null;
    }

    if (defaultSupplierId !== undefined) {
      updateData.defaultSupplierId = defaultSupplierId;
    }

    if (unitOfMeasure !== undefined) {
      updateData.unitOfMeasure = unitOfMeasure;
    }

    if (cost !== undefined) {
      updateData.cost = cost.toString();
    }

    if (alertThreshold !== undefined) {
      updateData.alertThreshold = alertThreshold.toString();
    }

    const [updated] = await db
      .update(materialInventory)
      .set(updateData)
      .where(eq(materialInventory.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: 'Material inventory not found' },
        { status: 404 }
      );
    }

    // Fetch updated inventory with relations
    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventory.id, id),
      with: {
        material: {
          with: {
            category: true,
          },
        },
        supplier: true,
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const [deleted] = await db
      .delete(materialInventory)
      .where(eq(materialInventory.id, id))
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
