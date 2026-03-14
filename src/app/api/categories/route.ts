import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { productCategory } from '@/drizzle/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { requireTenantId } from '@/lib/tenant-context';
import { createProductCategorySchema, generateSlug } from '@/lib/validations';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

async function getCategoriesHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const isActiveParam = searchParams.get('isActive');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const conditions = [eq(productCategory.organizationId, tenantId)];

    if (parentId === 'null' || parentId === '') {
      conditions.push(isNull(productCategory.parentId));
    } else if (parentId) {
      conditions.push(eq(productCategory.parentId, parentId));
    }

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      conditions.push(eq(productCategory.isActive, isActive));
    }

    if (!includeDeleted) {
      conditions.push(isNull(productCategory.deletedAt));
    }

    const categories = await db
      .select()
      .from(productCategory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(productCategory.displayOrder, productCategory.name);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching product categories:', error);
    return NextResponse.json({ error: 'Failed to fetch product categories' }, { status: 500 });
  }
}

async function createCategoryHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await req.json();
    const validatedData = createProductCategorySchema.parse(body);

    const slug = validatedData.slug || generateSlug(validatedData.name);

    const existing = await db
      .select()
      .from(productCategory)
      .where(and(eq(productCategory.organizationId, tenantId), eq(productCategory.slug, slug)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Product category with this slug already exists' },
        { status: 400 }
      );
    }

    if (validatedData.parentId) {
      const parent = await db
        .select()
        .from(productCategory)
        .where(
          and(
            eq(productCategory.organizationId, tenantId),
            eq(productCategory.id, validatedData.parentId)
          )
        )
        .limit(1);

      if (parent.length === 0) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
      }
    }

    const newCategory = await db
      .insert(productCategory)
      .values({
        id: randomUUID(),
        organizationId: tenantId,
        ...validatedData,
        slug,
        parentId: validatedData.parentId || null,
      })
      .returning();

    return NextResponse.json(newCategory[0], { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating product category:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create product category' }, { status: 500 });
  }
}

// GET /api/categories - List categories
export const GET = protectRoute(getCategoriesHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.READ,
});

// POST /api/categories - Create category
export const POST = protectRoute(createCategoryHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.CREATE,
});
