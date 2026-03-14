import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { materialInventoryMovement, materialBatch } from '@/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { MaterialMovementType, materialMovementTypeSchema } from '@/lib/validations/material';

const createMovementSchema = z.object({
  type: materialMovementTypeSchema,
  quantity: z.number(),
  unitPrice: z.number().optional(),
  batchId: z.string().optional(),
  remarks: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  createdBy: z.string().optional(),
});

// GET /api/material-inventories/[id]/movements - Get movements for a material inventory
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const type = searchParams.get('type');

    const whereConditions = [eq(materialInventoryMovement.materialInventoryId, id)];

    if (type) {
      whereConditions.push(eq(materialInventoryMovement.type, type as MaterialMovementType));
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(materialInventoryMovement)
      .where(and(...whereConditions));

    const total = Number(countResult[0]?.count || 0);

    const movements = await db.query.materialInventoryMovement.findMany({
      where: and(...whereConditions),
      with: {
        batch: {
          columns: {
            id: true,
            batchNumber: true,
          },
        },
      },
      limit,
      offset,
      orderBy: [desc(materialInventoryMovement.date)],
    });

    return NextResponse.json({
      data: movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}

// POST /api/material-inventories/[id]/movements - Create a new movement
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const validation = createMovementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { type, quantity, unitPrice, batchId, remarks, referenceType, referenceId, createdBy } =
      validation.data;

    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventoryMovement.materialInventoryId, id),
    });

    if (!inventory) {
      return NextResponse.json({ error: 'Material inventory not found' }, { status: 404 });
    }

    // Use provided unitPrice or fallback to current inventory cost
    const finalUnitPrice = unitPrice ?? Number(inventory.cost || 0);

    if (batchId) {
      const batch = await db.query.materialBatch.findFirst({
        where: eq(materialBatch.id, batchId),
      });

      if (!batch || batch.materialInventoryId !== id) {
        return NextResponse.json(
          { error: 'Invalid batch for this material inventory' },
          { status: 400 }
        );
      }

      const isNegativeMovement = [
        'production_consumption',
        'waste',
        'expired',
        'transfer_out',
        'transfer_to_pos',
      ].includes(type);
      if (isNegativeMovement) {
        const batchQuantity = parseFloat(batch.quantity);
        if (batchQuantity < quantity) {
          return NextResponse.json(
            {
              error: `Insufficient quantity in batch ${batch.batchNumber}. Available: ${batchQuantity}`,
            },
            { status: 400 }
          );
        }

        await db
          .update(materialBatch)
          .set({
            quantity: sql`${materialBatch.quantity} - ${quantity}`,
          })
          .where(eq(materialBatch.id, batchId));
      } else {
        await db
          .update(materialBatch)
          .set({
            quantity: sql`${materialBatch.quantity} + ${quantity}`,
          })
          .where(eq(materialBatch.id, batchId));
      }
    }

    const [movement] = await db
      .insert(materialInventoryMovement)
      .values({
        id: randomUUID(),
        materialInventoryId: id,
        batchId: batchId || null,
        type,
        quantity: quantity.toString(),
        unitPrice: finalUnitPrice.toFixed(2),
        remarks: remarks || null,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        createdBy: createdBy || null,
      })
      .returning();

    const createdMovement = await db.query.materialInventoryMovement.findFirst({
      where: eq(materialInventoryMovement.id, movement.id),
      with: {
        batch: true,
      },
    });

    return NextResponse.json(createdMovement, { status: 201 });
  } catch (error) {
    console.error('Error creating movement:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 });
  }
}
