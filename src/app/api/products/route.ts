import { db } from '@/drizzle/db';
import { product } from '@/drizzle/schema/products';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { requireTenantId } from '@/lib/tenant-context';
import { createProductSchema } from '@/lib/validations/product';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { and, eq, ilike, or, isNull, count, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function getProductsHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions = [eq(product.organizationId, tenantId)];

    if (!includeDeleted) {
      conditions.push(isNull(product.deletedAt));
    }

    if (statusParam !== null) {
      const status = statusParam === 'active' ? true : false;
      conditions.push(eq(product.status, status));
    }

    if (categoryId) {
      conditions.push(eq(product.categoryId, categoryId));
    }

    if (search) {
      const searchCondition = or(
        ilike(product.name, `%${search}%`),
        ilike(product.description, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(product)
      .where(whereClause);

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
    const tenantId = await requireTenantId();
    const body = await req.json();
    const validatedData = createProductSchema.parse(body);

    const existingProduct = await db
      .select()
      .from(product)
      .where(and(eq(product.organizationId, tenantId), eq(product.name, validatedData.name)))
      .limit(1);

    if (existingProduct.length > 0) {
      return NextResponse.json(
        { error: 'A product with this name already exists' },
        { status: 400 }
      );
    }

    const newProduct = await db
      .insert(product)
      .values({
        id: randomUUID(),
        organizationId: tenantId,
        ...validatedData,
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
