import { db } from '@/db/db';
import { product, productCategory } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { updateProductSchema, generateSlug } from '@/lib/validations/product';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

async function getProductHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    // Get product with category relation
    const [foundProduct] = await db
      .select({
        id: product.id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        barcode: product.barcode,
        description: product.description,
        sellingPrice: product.sellingPrice,
        costPrice: product.costPrice,
        categoryId: product.categoryId,
        image: product.image,
        status: product.status,
        unitOfMeasure: product.unitOfMeasure,
        taxRate: product.taxRate,
        createdBy: product.createdBy,
        updatedBy: product.updatedBy,
        deletedAt: product.deletedAt,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        category: {
          id: productCategory.id,
          name: productCategory.name,
          slug: productCategory.slug,
        },
      })
      .from(product)
      .leftJoin(productCategory, eq(product.categoryId, productCategory.id))
      .where(and(eq(product.id, id), isNull(product.deletedAt)))
      .limit(1);

    if (!foundProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(foundProduct);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

async function updateProductHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateProductSchema.parse(body);

    // Generate slug from name if name is provided but slug is not
    if (validatedData.name && !validatedData.slug) {
      validatedData.slug = generateSlug(validatedData.name);
    }

    // Check if slug already exists (excluding current product)
    if (validatedData.slug) {
      const existingProduct = await db
        .select()
        .from(product)
        .where(eq(product.slug, validatedData.slug))
        .limit(1);

      if (existingProduct.length > 0 && existingProduct[0].id !== id) {
        return NextResponse.json(
          { error: 'A product with this slug already exists' },
          { status: 400 }
        );
      }
    }

    // Check if SKU already exists (excluding current product)
    if (validatedData.sku) {
      const existingSku = await db
        .select()
        .from(product)
        .where(eq(product.sku, validatedData.sku))
        .limit(1);

      if (existingSku.length > 0 && existingSku[0].id !== id) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 400 }
        );
      }
    }

    // Check if barcode already exists (excluding current product)
    if (validatedData.barcode) {
      const existingBarcode = await db
        .select()
        .from(product)
        .where(eq(product.barcode, validatedData.barcode))
        .limit(1);

      if (existingBarcode.length > 0 && existingBarcode[0].id !== id) {
        return NextResponse.json(
          { error: 'A product with this barcode already exists' },
          { status: 400 }
        );
      }
    }

    // Convert prices to strings for database storage if provided
    const updateData: Record<string, unknown> = { ...validatedData };

    if (validatedData.sellingPrice !== undefined) {
      updateData.sellingPrice =
        typeof validatedData.sellingPrice === 'number'
          ? validatedData.sellingPrice.toString()
          : validatedData.sellingPrice;
    }

    if (validatedData.costPrice !== undefined) {
      updateData.costPrice =
        typeof validatedData.costPrice === 'number'
          ? validatedData.costPrice.toString()
          : validatedData.costPrice;
    }

    if (validatedData.taxRate !== undefined) {
      updateData.taxRate =
        typeof validatedData.taxRate === 'number'
          ? validatedData.taxRate.toString()
          : validatedData.taxRate;
    }

    const [updatedProduct] = await db
      .update(product)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(product.id, id))
      .returning();

    if (!updatedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.cause },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

async function deleteProductHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    // Soft delete - set deletedAt timestamp
    const [deletedProduct] = await db
      .update(product)
      .set({ deletedAt: new Date() })
      .where(and(eq(product.id, id), isNull(product.deletedAt)))
      .returning({ id: product.id });

    if (!deletedProduct) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}

// GET /api/products/:id - Get product by ID
export const GET = protectRoute(getProductHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});

// PATCH /api/products/:id - Update product by ID
export const PATCH = protectRoute(updateProductHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});

// DELETE /api/products/:id - Delete product by ID
export const DELETE = protectRoute(deleteProductHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.DELETE,
});
