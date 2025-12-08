import { db } from '@/db/db';
import { inventory, product, location } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { createInventorySchema } from '@/lib/validations/inventory';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { eq, and, count, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getBulkStockLevels } from '@/lib/services/inventory-calculation';

export async function getInventoryHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const productId = searchParams.get('productId');

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (locationId) {
      conditions.push(eq(inventory.locationId, locationId));
    }

    if (productId) {
      conditions.push(eq(inventory.productId, productId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(inventory)
      .where(whereClause);

    const inventoryRecords = await db
      .select({
        id: inventory.id,
        productId: inventory.productId,
        productName: product.name,
        productSku: product.sku,
        locationId: inventory.locationId,
        locationName: location.name,
        alertThreshold: inventory.alertThreshold,
        unitOfMeasure: inventory.unitOfMeasure,
        createdAt: inventory.createdAt,
        updatedAt: inventory.updatedAt,
      })
      .from(inventory)
      .innerJoin(product, eq(inventory.productId, product.id))
      .innerJoin(location, eq(inventory.locationId, location.id))
      .where(whereClause)
      .orderBy(desc(inventory.createdAt))
      .limit(limit)
      .offset(offset);

    const inventoryIds = inventoryRecords.map((inv) => inv.id);
    const stockLevels = await getBulkStockLevels(inventoryIds);

    const inventoryWithStock = inventoryRecords.map((inv) => ({
      ...inv,
      currentStock: stockLevels[inv.id]?.currentStock || 0,
      belowThreshold:
        (stockLevels[inv.id]?.currentStock || 0) <= Number(inv.alertThreshold),
    }));

    return NextResponse.json({
      inventory: inventoryWithStock,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);

    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function createInventoryHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createInventorySchema.parse(body);

    const existingInventory = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, validatedData.productId),
          eq(inventory.locationId, validatedData.locationId)
        )
      )
      .limit(1);

    if (existingInventory.length > 0) {
      return NextResponse.json(
        { error: 'Inventory already exists for this product at this location' },
        { status: 400 }
      );
    }

    const productExists = await db
      .select()
      .from(product)
      .where(eq(product.id, validatedData.productId))
      .limit(1);

    if (productExists.length === 0) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const locationExists = await db
      .select()
      .from(location)
      .where(eq(location.id, validatedData.locationId))
      .limit(1);

    if (locationExists.length === 0) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    const newInventory = await db
      .insert(inventory)
      .values({
        id: randomUUID(),
        productId: validatedData.productId,
        locationId: validatedData.locationId,
        alertThreshold: validatedData.alertThreshold.toString(),
        unitOfMeasure: validatedData.unitOfMeasure,
      })
      .returning();

    return NextResponse.json(newInventory[0], { status: 201 });
  } catch (error) {
    console.error('Error creating inventory:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create inventory' },
      { status: 500 }
    );
  }
}

// GET /api/inventory - List inventory with current stock
export const GET = protectRoute(getInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});

// POST /api/inventory - Create inventory record
export const POST = protectRoute(createInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.CREATE,
});
