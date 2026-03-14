import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { materialCategory } from '@/drizzle/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { updateMaterialCategorySchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';

async function getMaterialCategoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [foundCategory] = await db
      .select()
      .from(materialCategory)
      .where(and(eq(materialCategory.id, id), isNull(materialCategory.deletedAt)))
      .limit(1);

    if (!foundCategory) {
      return NextResponse.json({ error: 'Material category not found' }, { status: 404 });
    }

    const children = await db
      .select()
      .from(materialCategory)
      .where(and(eq(materialCategory.parentId, id), isNull(materialCategory.deletedAt)))
      .orderBy(materialCategory.displayOrder, materialCategory.name);

    return NextResponse.json({
      ...foundCategory,
      children,
    });
  } catch (error) {
    console.error('Error fetching material category:', error);
    return NextResponse.json({ error: 'Failed to fetch material category' }, { status: 500 });
  }
}

async function updateMaterialCategoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateMaterialCategorySchema.parse(body);

    const [existing] = await db
      .select()
      .from(materialCategory)
      .where(and(eq(materialCategory.id, id), isNull(materialCategory.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Material category not found' }, { status: 404 });
    }

    if (validatedData.slug && validatedData.slug !== existing.slug) {
      const slugConflict = await db
        .select()
        .from(materialCategory)
        .where(eq(materialCategory.slug, validatedData.slug))
        .limit(1);

      if (slugConflict.length > 0 && slugConflict[0].id !== id) {
        return NextResponse.json(
          { error: 'Material category with this slug already exists' },
          { status: 400 }
        );
      }
    }

    if (validatedData.parentId !== undefined && validatedData.parentId !== null) {
      if (validatedData.parentId === id) {
        return NextResponse.json(
          { error: 'Material category cannot be its own parent' },
          { status: 400 }
        );
      }

      const parent = await db
        .select()
        .from(materialCategory)
        .where(eq(materialCategory.id, validatedData.parentId))
        .limit(1);

      if (parent.length === 0) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 400 });
      }

      if (parent[0].parentId === id) {
        return NextResponse.json({ error: 'Circular reference detected' }, { status: 400 });
      }
    }

    const [updatedCategory] = await db
      .update(materialCategory)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(materialCategory.id, id))
      .returning();

    return NextResponse.json(updatedCategory);
  } catch (error: unknown) {
    console.error('Error updating material category:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to update material category' }, { status: 500 });
  }
}

async function deleteMaterialCategoryHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [existing] = await db
      .select()
      .from(materialCategory)
      .where(and(eq(materialCategory.id, id), isNull(materialCategory.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Material category not found' }, { status: 404 });
    }

    const children = await db
      .select()
      .from(materialCategory)
      .where(and(eq(materialCategory.parentId, id), isNull(materialCategory.deletedAt)))
      .limit(1);

    if (children.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete material category with children. Delete or move children first.',
        },
        { status: 400 }
      );
    }

    // Soft delete - set deletedAt timestamp
    await db
      .update(materialCategory)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(materialCategory.id, id));

    return NextResponse.json({
      success: true,
      message: 'Material category soft deleted',
    });
  } catch (error) {
    console.error('Error deleting material category:', error);
    return NextResponse.json({ error: 'Failed to delete material category' }, { status: 500 });
  }
}

// GET /api/material-categories/[id] - Get single material category
export const GET = protectRoute(getMaterialCategoryHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.READ,
});

// PATCH /api/material-categories/[id] - Update material category
export const PATCH = protectRoute(updateMaterialCategoryHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.UPDATE,
});

// DELETE /api/material-categories/[id] - Soft delete material category
export const DELETE = protectRoute(deleteMaterialCategoryHandler, {
  resource: RESOURCES.PRODUCTS,
  action: ACTIONS.DELETE,
});
