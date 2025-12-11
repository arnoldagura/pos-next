import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { materialInventoryMovement, materialBatch } from '@/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';

export enum MaterialMovementType {
  Purchase = 'purchase',
  ProductionConsumption = 'production_consumption',
  Adjustment = 'adjustment',
  Waste = 'waste',
  Expired = 'expired',
  TransferIn = 'transfer_in',
  TransferOut = 'transfer_out',
  TransferToPOS = 'transfer_to_pos',
}

const createMovementSchema = z.object({
  type: z.enum(MaterialMovementType),
  quantity: z.number(),
  unitPrice: z.number().optional(),
  batchId: z.string().optional(),
  remarks: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  createdBy: z.string().optional(),
});

// GET /api/material-inventories/[id]/movements - Get movements for a material inventory
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const type = searchParams.get('type');

    const whereConditions = [
      eq(materialInventoryMovement.materialInventoryId, id),
    ];

    if (type) {
      whereConditions.push(
        eq(materialInventoryMovement.type, type as MaterialMovementType)
      );
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
    return NextResponse.json(
      { error: 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}

// POST /api/material-inventories/[id]/movements - Create a new movement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    const validation = createMovementSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      type,
      quantity,
      unitPrice,
      batchId,
      remarks,
      referenceType,
      referenceId,
      createdBy,
    } = validation.data;

    // Verify material inventory exists
    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventoryMovement.materialInventoryId, id),
    });

    if (!inventory) {
      return NextResponse.json(
        { error: 'Material inventory not found' },
        { status: 404 }
      );
    }

    // If batchId is provided, verify it exists and belongs to this inventory
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

      // For consumption, waste, expired movements (negative quantity), verify sufficient stock in batch
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

        // Update batch quantity
        await db
          .update(materialBatch)
          .set({
            quantity: sql`${materialBatch.quantity} - ${quantity}`,
          })
          .where(eq(materialBatch.id, batchId));
      } else {
        // For positive movements (purchase, adjustment in, transfer in)
        await db
          .update(materialBatch)
          .set({
            quantity: sql`${materialBatch.quantity} + ${quantity}`,
          })
          .where(eq(materialBatch.id, batchId));
      }
    }

    // Create the movement record
    const [movement] = await db
      .insert(materialInventoryMovement)
      .values({
        id: randomUUID(),
        materialInventoryId: id,
        batchId: batchId || null,
        type,
        quantity: quantity.toString(),
        unitPrice: unitPrice?.toString() || null,
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

    return NextResponse.json(
      { error: 'Failed to create movement' },
      { status: 500 }
    );
  }
}
