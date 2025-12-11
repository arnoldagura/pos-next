import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { inventoryMovement, inventory } from '@/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';

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

// GET /api/inventory/[id]/movements - Get movements for a specific inventory
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

    const whereConditions = [eq(inventoryMovement.inventoryId, id)];

    if (type) {
      whereConditions.push(
        eq(inventoryMovement.type, type as InventoryMovementType)
      );
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(inventoryMovement)
      .where(and(...whereConditions));

    const total = Number(countResult[0]?.count || 0);

    const movements = await db.query.inventoryMovement.findMany({
      where: and(...whereConditions),
      limit,
      offset,
      orderBy: [desc(inventoryMovement.date)],
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

// POST /api/inventory/[id]/movements - Create a new movement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
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

    // Verify inventory exists
    const inventoryRecord = await db.query.inventory.findFirst({
      where: eq(inventory.id, id),
    });

    if (!inventoryRecord) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      );
    }

    // Create the movement record
    const [movement] = await db
      .insert(inventoryMovement)
      .values({
        id: randomUUID(),
        inventoryId: id,
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

    return NextResponse.json(
      { error: 'Failed to create movement' },
      { status: 500 }
    );
  }
}
