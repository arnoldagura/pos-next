import { db } from '@/db/db';
import {
  productInventory,
  productInventoryMovement,
  product,
  location,
} from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { updateInventorySchema } from '@/lib/validations/product';
import { protectRoute } from '@/middleware/rbac';
import { eq, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentStock } from '@/lib/services/inventory-calculation';
import { generateSlug } from '@/lib/validations';

export async function getInventoryByIdHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const inventoryRecord = await db
      .select({
        id: productInventory.id,
        productId: productInventory.productId,
        productName: product.name,
        productDescription: product.description,
        locationId: productInventory.locationId,
        locationName: location.name,
        sku: productInventory.sku,
        slug: productInventory.slug,
        barcode: productInventory.barcode,
        unitPrice: productInventory.unitPrice,
        costPrice: productInventory.costPrice,
        unitOfMeasure: productInventory.unitOfMeasure,
        taxRate: productInventory.taxRate,
        alertThreshold: productInventory.alertThreshold,
        createdAt: productInventory.createdAt,
        updatedAt: productInventory.updatedAt,
      })
      .from(productInventory)
      .innerJoin(product, eq(productInventory.productId, product.id))
      .innerJoin(location, eq(productInventory.locationId, location.id))
      .where(eq(productInventory.id, id))
      .limit(1);

    if (inventoryRecord.length === 0) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      );
    }

    const stockLevel = await getCurrentStock(id);

    const movements = await db
      .select()
      .from(productInventoryMovement)
      .where(eq(productInventoryMovement.productInventoryId, id))
      .orderBy(desc(productInventoryMovement.date))
      .limit(50);

    return NextResponse.json({
      ...inventoryRecord[0],
      currentStock: stockLevel?.currentStock || 0,
      movements,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);

    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function updateInventoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateInventorySchema.parse(body);

    const existingInventory = await db
      .select()
      .from(productInventory)
      .leftJoin(product, eq(productInventory.productId, product.id))
      .where(eq(productInventory.id, id))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (existingInventory === null) {
      return NextResponse.json(
        { error: 'Product Inventory not found' },
        { status: 404 }
      );
    }
    if (existingInventory.product === null)
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    if (validatedData.variantName && !validatedData.slug) {
      validatedData.slug = generateSlug(
        existingInventory.product?.name,
        validatedData.variantName
      );
    }

    if (
      validatedData.slug &&
      validatedData.slug !== existingInventory.product_inventory.slug
    ) {
      const existingProduct = await db
        .select()
        .from(productInventory)
        .where(eq(productInventory.slug, validatedData.slug))
        .limit(1);

      if (existingProduct.length > 0 && existingProduct[0].id !== id) {
        return NextResponse.json(
          { error: 'A product with this slug already exists' },
          { status: 400 }
        );
      }
    }

    if (
      validatedData.sku &&
      validatedData.sku !== existingInventory.product_inventory.sku
    ) {
      const existingSku = await db
        .select()
        .from(productInventory)
        .where(eq(productInventory.sku, validatedData.sku))
        .limit(1);

      if (existingSku.length > 0 && existingSku[0].id !== id) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 400 }
        );
      }
    }

    if (validatedData.barcode) {
      const existingBarcode = await db
        .select()
        .from(productInventory)
        .where(eq(productInventory.barcode, validatedData.barcode))
        .limit(1);

      if (existingBarcode.length > 0 && existingBarcode[0].id !== id) {
        return NextResponse.json(
          { error: 'A product with this barcode already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, string | undefined> = {};

    if (validatedData.barcode !== undefined) {
      updateData.barcode = validatedData.barcode;
    }

    if (validatedData.unitPrice !== undefined) {
      updateData.unitPrice = validatedData.unitPrice.toString();
    }

    if (validatedData.costPrice !== undefined) {
      updateData.costPrice = validatedData.costPrice.toString();
    }

    if (validatedData.unitOfMeasure !== undefined) {
      updateData.unitOfMeasure = validatedData.unitOfMeasure;
    }

    if (validatedData.taxRate !== undefined) {
      updateData.taxRate = validatedData.taxRate.toString();
    }

    if (validatedData.alertThreshold !== undefined) {
      updateData.alertThreshold = validatedData.alertThreshold.toString();
    }

    const updatedInventory = await db
      .update(productInventory)
      .set(updateData)
      .where(eq(productInventory.id, id))
      .returning();

    return NextResponse.json(updatedInventory[0]);
  } catch (error) {
    console.error('Error updating inventory:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

export async function deleteInventoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const existingInventory = await db
      .select()
      .from(productInventory)
      .where(eq(productInventory.id, id))
      .limit(1);

    if (existingInventory.length === 0) {
      return NextResponse.json(
        { error: 'Inventory not found' },
        { status: 404 }
      );
    }

    await db.delete(productInventory).where(eq(productInventory.id, id));

    return NextResponse.json({ message: 'Inventory deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory:', error);

    return NextResponse.json(
      { error: 'Failed to delete inventory' },
      { status: 500 }
    );
  }
}

// GET /api/product-inventories/[id] - Get single inventory with movements
export const GET = protectRoute(getInventoryByIdHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});

// PATCH /api/product-inventories/[id] - Update inventory record
export const PATCH = protectRoute(updateInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});

// DELETE /api/product-inventories/[id] - Delete inventory record
export const DELETE = protectRoute(deleteInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.DELETE,
});
