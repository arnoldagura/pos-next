import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { productionOrder } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateProductionOrderSchema = z.object({
  scheduledDate: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/production-orders/[id] - Get single production order
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const order = await db.query.productionOrder.findFirst({
      where: eq(productionOrder.id, id),
      with: {
        recipe: {
          with: {
            ingredients: {
              with: {
                material: true,
              },
            },
          },
        },
        location: true,
        outputProductInventory: true,
        outputMaterialInventory: true,
        materials: {
          with: {
            materialInventory: {
              with: {
                material: true,
              },
            },
          },
        },
        qualityChecks: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching production order:', error);
    return NextResponse.json({ error: 'Failed to fetch production order' }, { status: 500 });
  }
}

// PUT /api/production-orders/[id] - Update production order
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = updateProductionOrderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { scheduledDate, notes } = validation.data;

    const existingOrder = await db.query.productionOrder.findFirst({
      where: eq(productionOrder.id, id),
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
    }

    if (existingOrder.status !== 'draft') {
      return NextResponse.json(
        {
          error: 'Can only update draft orders',
        },
        { status: 400 }
      );
    }

    await db
      .update(productionOrder)
      .set({
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        notes: notes !== undefined ? notes : undefined,
        updatedAt: new Date(),
      })
      .where(eq(productionOrder.id, id));

    const updatedOrder = await db.query.productionOrder.findFirst({
      where: eq(productionOrder.id, id),
      with: {
        recipe: true,
        location: true,
        outputProductInventory: true,
        outputMaterialInventory: true,
        materials: {
          with: {
            materialInventory: true,
          },
        },
      },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating production order:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update production order' }, { status: 500 });
  }
}

// DELETE /api/production-orders/[id] - Delete draft production order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingOrder = await db.query.productionOrder.findFirst({
      where: eq(productionOrder.id, id),
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
    }

    if (existingOrder.status !== 'draft') {
      return NextResponse.json(
        {
          error: 'Can only delete draft orders. Use cancel for other statuses.',
        },
        { status: 400 }
      );
    }

    await db.delete(productionOrder).where(eq(productionOrder.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting production order:', error);
    return NextResponse.json({ error: 'Failed to delete production order' }, { status: 500 });
  }
}
