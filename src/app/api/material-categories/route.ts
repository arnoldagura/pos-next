import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { materialCategory } from '@/drizzle/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { requireTenantId } from '@/lib/tenant-context';
import { createMaterialCategorySchema, generateSlug } from '@/lib/validations';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';

async function getMaterialCategoriesHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get('parentId');
    const isActiveParam = searchParams.get('isActive');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const conditions = [eq(materialCategory.organizationId, tenantId)];

    if (parentId === 'null' || parentId === '') {
      conditions.push(isNull(materialCategory.parentId));
    } else if (parentId) {
      conditions.push(eq(materialCategory.parentId, parentId));
    }

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      conditions.push(eq(materialCategory.isActive, isActive));
    }

    if (!includeDeleted) {
      conditions.push(isNull(materialCategory.deletedAt));
    }

    const categories = await db
      .select()
      .from(materialCategory)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(materialCategory.displayOrder, materialCategory.name);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching material categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material categories' },
      { status: 500 }
    );
  }
}

async function createMaterialCategoryHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await req.json();
    const validatedData = createMaterialCategorySchema.parse(body);

    const slug = validatedData.slug || generateSlug(validatedData.name);

    const existing = await db
      .select()
      .from(materialCategory)
      .where(and(eq(materialCategory.organizationId, tenantId), eq(materialCategory.slug, slug)))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Material category with this slug already exists' },
        { status: 400 }
      );
    }

    if (validatedData.parentId) {
      const parent = await db
        .select()
        .from(materialCategory)
        .where(and(eq(materialCategory.organizationId, tenantId), eq(materialCategory.id, validatedData.parentId)))
        .limit(1);

      if (parent.length === 0) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }
    }

    const newCategory = await db
      .insert(materialCategory)
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
    console.error('Error creating material category:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create material category' },
      { status: 500 }
    );
  }
}

// GET /api/material-categories - List material categories
export const GET = protectRoute(getMaterialCategoriesHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.READ,
});

// POST /api/material-categories - Create material category
export const POST = protectRoute(createMaterialCategoryHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.CREATE,
});
