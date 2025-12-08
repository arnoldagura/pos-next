import { db } from '@/db/db';
import { material, materialCategory } from '@/drizzle/schema';
import { supplier } from '@/drizzle/schema/suppliers';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { updateMaterialSchema } from '@/lib/validations/material';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

async function getMaterialHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [foundMaterial] = await db
      .select({
        id: material.id,
        name: material.name,
        sku: material.sku,
        description: material.description,
        type: material.type,
        categoryId: material.categoryId,
        supplierId: material.supplierId,
        unitOfMeasure: material.unitOfMeasure,
        defaultCost: material.defaultCost,
        alertThreshold: material.alertThreshold,
        expiryTracking: material.expiryTracking,
        image: material.image,
        status: material.status,
        createdBy: material.createdBy,
        updatedBy: material.updatedBy,
        deletedAt: material.deletedAt,
        createdAt: material.createdAt,
        updatedAt: material.updatedAt,
        category: {
          id: materialCategory.id,
          name: materialCategory.name,
          slug: materialCategory.slug,
        },
        supplier: {
          id: supplier.id,
          name: supplier.name,
        },
      })
      .from(material)
      .leftJoin(materialCategory, eq(material.categoryId, materialCategory.id))
      .leftJoin(supplier, eq(material.supplierId, supplier.id))
      .where(and(eq(material.id, id), isNull(material.deletedAt)))
      .limit(1);

    if (!foundMaterial) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json(foundMaterial);
  } catch (error) {
    console.error('Error fetching material:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material' },
      { status: 500 }
    );
  }
}

async function updateMaterialHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateMaterialSchema.parse(body);

    if (validatedData.sku) {
      const existingSku = await db
        .select()
        .from(material)
        .where(eq(material.sku, validatedData.sku))
        .limit(1);

      if (existingSku.length > 0 && existingSku[0].id !== id) {
        return NextResponse.json(
          { error: 'A material with this SKU already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = { ...validatedData };

    if (validatedData.defaultCost !== undefined) {
      updateData.defaultCost =
        typeof validatedData.defaultCost === 'number'
          ? validatedData.defaultCost.toString()
          : validatedData.defaultCost;
    }

    if (validatedData.alertThreshold !== undefined) {
      updateData.alertThreshold =
        typeof validatedData.alertThreshold === 'number'
          ? validatedData.alertThreshold.toString()
          : validatedData.alertThreshold;
    }

    if (validatedData.sku !== undefined) {
      updateData.sku =
        validatedData.sku && validatedData.sku.trim() !== ''
          ? validatedData.sku
          : null;
    }

    const [updatedMaterial] = await db
      .update(material)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(material.id, id))
      .returning();

    if (!updatedMaterial) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json(updatedMaterial);
  } catch (error) {
    console.error('Error updating material:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.cause },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    );
  }
}

async function deleteMaterialHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [deletedMaterial] = await db
      .update(material)
      .set({ deletedAt: new Date() })
      .where(and(eq(material.id, id), isNull(material.deletedAt)))
      .returning({ id: material.id });

    if (!deletedMaterial) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting material:', error);
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getMaterialHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});

export const PATCH = protectRoute(updateMaterialHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.UPDATE,
});

export const DELETE = protectRoute(deleteMaterialHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.DELETE,
});
