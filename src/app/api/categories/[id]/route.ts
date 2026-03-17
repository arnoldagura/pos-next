import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { productCategory } from '@/drizzle/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { requireTenantId } from '@/lib/tenant-context';
import { invalidateEntityCache } from '@/lib/cache';
import { updateProductCategorySchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';

async function getCategoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const [foundCategory] = await db
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.organizationId, tenantId),
          eq(productCategory.id, id),
          isNull(productCategory.deletedAt)
        )
      )
      .limit(1);

    if (!foundCategory) {
      return NextResponse.json({ error: 'Product category not found' }, { status: 404 });
    }

    const children = await db
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.organizationId, tenantId),
          eq(productCategory.parentId, id),
          isNull(productCategory.deletedAt)
        )
      )
      .orderBy(productCategory.displayOrder, productCategory.name);

    return NextResponse.json({
      ...foundCategory,
      children,
    });
  } catch (error) {
    console.error('Error fetching product category:', error);
    return NextResponse.json({ error: 'Failed to fetch product category' }, { status: 500 });
  }
}

async function updateCategoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateProductCategorySchema.parse(body);

    const [existing] = await db
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.organizationId, tenantId),
          eq(productCategory.id, id),
          isNull(productCategory.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Product category not found' }, { status: 404 });
    }

    if (validatedData.slug && validatedData.slug !== existing.slug) {
      const slugConflict = await db
        .select()
        .from(productCategory)
        .where(
          and(
            eq(productCategory.organizationId, tenantId),
            eq(productCategory.slug, validatedData.slug)
          )
        )
        .limit(1);

      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        return NextResponse.json(
          { error: 'Product category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    if (validatedData.parentId !== undefined && validatedData.parentId !== null) {
      if (validatedData.parentId === id) {
        return NextResponse.json(
          { error: 'Product category cannot be its own parent' },
          { status: 400 }
        );
      }

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

      if (parent[0].parentId === id) {
        return NextResponse.json({ error: 'Circular reference detected' }, { status: 400 });
      }
    }

    const [updatedCategory] = await db
      .update(productCategory)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(and(eq(productCategory.organizationId, tenantId), eq(productCategory.id, id)))
      .returning();

    await invalidateEntityCache('categories', tenantId);

    return NextResponse.json(updatedCategory);
  } catch (error: unknown) {
    console.error('Error updating product category:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update product category' }, { status: 500 });
  }
}

async function deleteCategoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const tenantId = await requireTenantId();
    const { id } = await context.params;

    const [existing] = await db
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.organizationId, tenantId),
          eq(productCategory.id, id),
          isNull(productCategory.deletedAt)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Product category not found' }, { status: 404 });
    }

    const children = await db
      .select()
      .from(productCategory)
      .where(
        and(
          eq(productCategory.organizationId, tenantId),
          eq(productCategory.parentId, id),
          isNull(productCategory.deletedAt)
        )
      )
      .limit(1);

    if (children.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete product category with children. Delete or move children first.',
        },
        { status: 400 }
      );
    }

    // Soft delete - set deletedAt timestamp
    await db
      .update(productCategory)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(productCategory.organizationId, tenantId), eq(productCategory.id, id)));

    await invalidateEntityCache('categories', tenantId);

    return NextResponse.json({
      success: true,
      message: 'Product category soft deleted',
    });
  } catch (error) {
    console.error('Error deleting product category:', error);
    return NextResponse.json({ error: 'Failed to delete product category' }, { status: 500 });
  }
}

// GET /api/categories/[id] - Get single category
export const GET = protectRoute(getCategoryHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.READ,
});

// PATCH /api/categories/[id] - Update category
export const PATCH = protectRoute(updateCategoryHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.UPDATE,
});

// DELETE /api/categories/[id] - Soft delete category
export const DELETE = protectRoute(deleteCategoryHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.DELETE,
});
