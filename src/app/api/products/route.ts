import { db } from '@/drizzle/db';
import { product } from '@/drizzle/schema/products';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { createProductSchema, generateSlug } from '@/lib/validations/product';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { and, eq, ilike, or, gte, lte, isNull, count, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function getProductsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    // Exclude soft-deleted products by default
    if (!includeDeleted) {
      conditions.push(isNull(product.deletedAt));
    }

    if (statusParam !== null) {
      const status = statusParam === 'true';
      conditions.push(eq(product.status, status));
    }

    if (categoryId) {
      conditions.push(eq(product.categoryId, categoryId));
    }

    if (search) {
      conditions.push(
        or(
          ilike(product.name, `%${search}%`),
          ilike(product.sku, `%${search}%`),
          ilike(product.barcode, `%${search}%`),
          ilike(product.description, `%${search}%`)
        )
      );
    }

    if (minPrice) {
      conditions.push(gte(product.sellingPrice, minPrice));
    }

    if (maxPrice) {
      conditions.push(lte(product.sellingPrice, maxPrice));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count for pagination
    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(product)
      .where(whereClause);

    // Get products with pagination
    const products = await db
      .select()
      .from(product)
      .where(whereClause)
      .orderBy(desc(product.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);

    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function createProductHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createProductSchema.parse(body);

    // Generate slug from name if not provided
    const slug = validatedData.slug || generateSlug(validatedData.name);

    // Check if slug already exists
    const existingProduct = await db
      .select()
      .from(product)
      .where(eq(product.slug, slug))
      .limit(1);

    if (existingProduct.length > 0) {
      return NextResponse.json(
        { error: 'A product with this slug already exists' },
        { status: 400 }
      );
    }

    // Check if SKU already exists (if provided)
    if (validatedData.sku) {
      const existingSku = await db
        .select()
        .from(product)
        .where(eq(product.sku, validatedData.sku))
        .limit(1);

      if (existingSku.length > 0) {
        return NextResponse.json(
          { error: 'A product with this SKU already exists' },
          { status: 400 }
        );
      }
    }

    // Check if barcode already exists (if provided)
    if (validatedData.barcode) {
      const existingBarcode = await db
        .select()
        .from(product)
        .where(eq(product.barcode, validatedData.barcode))
        .limit(1);

      if (existingBarcode.length > 0) {
        return NextResponse.json(
          { error: 'A product with this barcode already exists' },
          { status: 400 }
        );
      }
    }

    // Convert prices to strings for database storage
    const sellingPrice =
      typeof validatedData.sellingPrice === 'number'
        ? validatedData.sellingPrice.toString()
        : validatedData.sellingPrice;

    const costPrice = validatedData.costPrice
      ? typeof validatedData.costPrice === 'number'
        ? validatedData.costPrice.toString()
        : validatedData.costPrice
      : undefined;

    const taxRate =
      validatedData.taxRate !== undefined
        ? typeof validatedData.taxRate === 'number'
          ? validatedData.taxRate.toString()
          : validatedData.taxRate
        : '0';

    const newProduct = await db
      .insert(product)
      .values({
        id: randomUUID(),
        ...validatedData,
        slug,
        sellingPrice,
        costPrice,
        taxRate,
      })
      .returning();

    return NextResponse.json(newProduct[0], { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}

// GET /api/products - List all products
export const GET = protectRoute(getProductsHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});

// POST /api/products - Create a new product
export const POST = protectRoute(createProductHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.CREATE,
});
