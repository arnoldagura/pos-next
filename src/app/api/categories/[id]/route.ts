import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { category } from '@/drizzle/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { updateCategorySchema } from '@/lib/validations';
import { ZodError } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function getCategoryHandler(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const [foundCategory] = await db
      .select()
      .from(category)
      .where(and(eq(category.id, id), isNull(category.deletedAt)))
      .limit(1);

    if (!foundCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const children = await db
      .select()
      .from(category)
      .where(and(eq(category.parentId, id), isNull(category.deletedAt)))
      .orderBy(category.displayOrder, category.name);

    return NextResponse.json({
      ...foundCategory,
      children,
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

async function updateCategoryHandler(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateCategorySchema.parse(body);

    const [existing] = await db
      .select()
      .from(category)
      .where(and(eq(category.id, id), isNull(category.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    if (validatedData.slug && validatedData.slug !== existing.slug) {
      const slugConflict = await db
        .select()
        .from(category)
        .where(eq(category.slug, validatedData.slug))
        .limit(1);

      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        return NextResponse.json(
          { error: 'Category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    if (
      validatedData.parentId !== undefined &&
      validatedData.parentId !== null
    ) {
      if (validatedData.parentId === id) {
        return NextResponse.json(
          { error: 'Category cannot be its own parent' },
          { status: 400 }
        );
      }

      const parent = await db
        .select()
        .from(category)
        .where(eq(category.id, validatedData.parentId))
        .limit(1);

      if (parent.length === 0) {
        return NextResponse.json(
          { error: 'Parent category not found' },
          { status: 400 }
        );
      }

      if (parent[0].parentId === id) {
        return NextResponse.json(
          { error: 'Circular reference detected' },
          { status: 400 }
        );
      }
    }

    const [updatedCategory] = await db
      .update(category)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(category.id, id))
      .returning();

    return NextResponse.json(updatedCategory);
  } catch (error: unknown) {
    console.error('Error updating category:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

async function deleteCategoryHandler(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const [existing] = await db
      .select()
      .from(category)
      .where(and(eq(category.id, id), isNull(category.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    const children = await db
      .select()
      .from(category)
      .where(and(eq(category.parentId, id), isNull(category.deletedAt)))
      .limit(1);

    if (children.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete category with children. Delete or move children first.',
        },
        { status: 400 }
      );
    }

    // Soft delete - set deletedAt timestamp
    await db
      .update(category)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(category.id, id));

    return NextResponse.json({
      success: true,
      message: 'Category soft deleted',
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    );
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
