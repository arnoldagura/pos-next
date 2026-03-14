import { db } from '@/db/db';
import { productInventory, product, location, productInventoryMovement } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { createProductInventorySchema } from '@/lib/validations/product';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { eq, and, count, desc, ilike, or, gte, lte, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { generateSku, generateSlug } from '@/lib/validations';
import { requireTenantId } from '@/lib/tenant-context';
import { InventoryMovementType } from './[id]/movements/route';

export async function getInventoryHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const productId = searchParams.get('productId');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const tenantId = await requireTenantId();
    const conditions = [eq(productInventory.organizationId, tenantId)];

    if (locationId) {
      conditions.push(eq(productInventory.locationId, locationId));
    }

    if (productId) {
      conditions.push(eq(productInventory.productId, productId));
    }

    if (search) {
      const searchCondition = or(
        ilike(productInventory.sku, `%${search}%`),
        ilike(productInventory.barcode, `%${search}%`),
        ilike(productInventory.variantName, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    if (minPrice) {
      conditions.push(gte(productInventory.unitPrice, minPrice));
    }

    if (maxPrice) {
      conditions.push(lte(productInventory.unitPrice, maxPrice));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(productInventory)
      .where(whereClause);

    const inventoryRecords = await db
      .select({
        id: productInventory.id,
        productId: productInventory.productId,
        productName: product.name,
        locationId: productInventory.locationId,
        locationName: location.name,
        variantName: productInventory.variantName,
        slug: productInventory.slug,
        sku: productInventory.sku,
        barcode: productInventory.barcode,
        unitPrice: productInventory.unitPrice,
        cost: productInventory.cost,
        currentQuantity: productInventory.currentQuantity,
        unitOfMeasure: productInventory.unitOfMeasure,
        taxRate: productInventory.taxRate,
        alertThreshold: productInventory.alertThreshold,
        createdAt: productInventory.createdAt,
        updatedAt: productInventory.updatedAt,
      })
      .from(productInventory)
      .innerJoin(product, eq(productInventory.productId, product.id))
      .innerJoin(location, eq(productInventory.locationId, location.id))
      .where(whereClause)
      .orderBy(desc(productInventory.createdAt))
      .limit(limit)
      .offset(offset);

    // const inventoryIds = inventoryRecords.map((inv) => inv.id);
    // const stockLevels = await getBulkStockLevels(inventoryIds);

    const inventoryWithStock = inventoryRecords.map((inv) => ({
      ...inv,
      belowThreshold: (parseFloat(inv.currentQuantity) || 0) <= Number(inv.alertThreshold),
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

    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function createInventoryHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await req.json();
    const validatedData = createProductInventorySchema.parse(body);

    const existingInventory = await db
      .select()
      .from(productInventory)
      .where(
        and(
          eq(productInventory.organizationId, tenantId),
          eq(productInventory.productId, validatedData.productId),
          eq(productInventory.locationId, validatedData.locationId),
          validatedData.variantName
            ? eq(productInventory.variantName, validatedData.variantName)
            : isNull(productInventory.variantName)
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

    const sku = generateSku(productExists[0].name, validatedData.variantName);

    const slug = generateSlug(productExists[0].name, validatedData.variantName);

    const existingSku = await db
      .select()
      .from(productInventory)
      .where(and(eq(productInventory.organizationId, tenantId), eq(productInventory.sku, sku)))
      .limit(1);

    if (existingSku.length > 0) {
      return NextResponse.json(
        { error: 'A product with this SKU already exists' },
        { status: 400 }
      );
    }

    if (validatedData.barcode) {
      const existingBarcode = await db
        .select()
        .from(productInventory)
        .where(
          and(
            eq(productInventory.organizationId, tenantId),
            eq(productInventory.barcode, validatedData.barcode)
          )
        )
        .limit(1);

      if (existingBarcode.length > 0) {
        return NextResponse.json(
          { error: 'A product with this barcode already exists' },
          { status: 400 }
        );
      }
    }

    const locationExists = await db
      .select()
      .from(location)
      .where(eq(location.id, validatedData.locationId))
      .limit(1);

    if (locationExists.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const newInventory = await db
      .insert(productInventory)
      .values({
        id: randomUUID(),
        organizationId: tenantId,
        productId: validatedData.productId,
        locationId: validatedData.locationId,
        variantName: validatedData.variantName || null,
        slug,
        sku,
        barcode: validatedData.barcode,
        unitPrice: validatedData.unitPrice.toString(),
        cost: validatedData.cost?.toString() ?? '0.00',
        currentQuantity: validatedData.currentQuantity?.toString() ?? '0.00',
        unitOfMeasure: validatedData.unitOfMeasure,
        taxRate: validatedData.taxRate.toString(),
        alertThreshold: validatedData.alertThreshold.toString(),
      })
      .returning();

    await db.insert(productInventoryMovement).values({
      id: randomUUID(),
      productInventoryId: newInventory[0].id,
      type: InventoryMovementType.Adjustment,
      quantity: validatedData.currentQuantity?.toString() ?? '0.00',
      unitPrice: validatedData.unitPrice.toString(),
      remarks: `initial unit price setup`,
      referenceType: null,
      referenceId: null,
    });

    return NextResponse.json(
      {
        ...newInventory[0],
        productName: productExists[0].name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inventory:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create inventory' }, { status: 500 });
  }
}

// GET /api/product-inventory - List inventory with current stock
export const GET = protectRoute(getInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});

// POST /api/product-inventory - Create inventory record
export const POST = protectRoute(createInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.CREATE,
});
