import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { productionMaterial, productionOrder } from '@/drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const materialCostUpdateSchema = z.object({
  materials: z.array(
    z.object({
      id: z.string(),
      unitCost: z.number().min(0),
      totalCost: z.number().min(0),
    })
  ),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;
    const body = await request.json();

    const validation = materialCostUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { materials } = validation.data;

    // Verify the order exists and is in completed status
    const order = await db.query.productionOrder.findFirst({
      where: eq(productionOrder.id, orderId),
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Production order not found' },
        { status: 404 }
      );
    }

    if (order.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only update costs for completed orders' },
        { status: 400 }
      );
    }

    // Update material costs
    await db.transaction(async (tx) => {
      for (const material of materials) {
        await tx
          .update(productionMaterial)
          .set({
            unitCost: material.unitCost.toFixed(2),
            totalCost: material.totalCost.toFixed(2),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(productionMaterial.id, material.id),
              eq(productionMaterial.productionOrderId, orderId)
            )
          );
      }

      // Recalculate total material cost
      const totalMaterialCost = materials.reduce(
        (sum, m) => sum + m.totalCost,
        0
      );

      await tx
        .update(productionOrder)
        .set({
          materialCost: totalMaterialCost.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(productionOrder.id, orderId));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating material costs:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to update material costs' },
      { status: 500 }
    );
  }
}
