import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { productInventory, productInventoryMovement } from '@/drizzle/schema';

export enum InventoryMovementType {
  Purchase = 'purchase',
  Sale = 'sale',
  Adjustment = 'adjustment',
  Waste = 'waste',
  TransferIn = 'transfer_in',
  TransferOut = 'transfer_out',
  ProductionOutput = 'production_output',
  ReceiveFromMaterial = 'receive_from_material',
}

const createMovementSchema = z.object({
  type: z.nativeEnum(InventoryMovementType),
  quantity: z.number(),
  unitPrice: z.number().optional(),
  remarks: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  createdBy: z.string().optional(),
});

// GET /api/product-inventories/[id]/movements - Get movements for a specific inventory
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const type = searchParams.get('type');

    const whereConditions = [eq(productInventoryMovement.productInventoryId, id)];

    if (type) {
      whereConditions.push(eq(productInventoryMovement.type, type as InventoryMovementType));
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(productInventoryMovement)
      .where(and(...whereConditions));

    const total = Number(countResult[0]?.count || 0);

    const movements = await db.query.productInventoryMovement.findMany({
      where: and(...whereConditions),
      limit,
      offset,
      orderBy: [desc(productInventoryMovement.date)],
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

// POST /api/product-inventories/[id]/movements - Create a new movement
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

    const { type, quantity, unitPrice, remarks, referenceType, referenceId, createdBy } =
      validation.data;

    const inventoryRecord = await db.query.productInventory.findFirst({
      where: eq(productInventory.id, id),
    });

    if (!inventoryRecord) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 });
    }

    const [movement] = await db
      .insert(productInventoryMovement)
      .values({
        id: randomUUID(),
        productInventoryId: id,
        type,
        quantity: quantity.toString(),
        unitPrice: unitPrice?.toString() || null,
        remarks: remarks || null,
        referenceType: referenceType || null,
        referenceId: referenceId || null,
        createdBy: createdBy || null,
      })
      .returning();

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error('Error creating movement:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 });
  }
}
