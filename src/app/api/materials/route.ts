import { db } from '@/drizzle/db';
import { material } from '@/drizzle/schema/materials';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import {
  createMaterialSchema,
  type MaterialType,
} from '@/lib/validations/material';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { and, eq, ilike, or, isNull, count, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function getMaterialsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const supplierId = searchParams.get('supplierId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (!includeDeleted) {
      conditions.push(isNull(material.deletedAt));
    }

    if (statusParam !== null) {
      const status = statusParam === 'active' ? true : false;
      conditions.push(eq(material.status, status));
    }

    if (categoryId) {
      conditions.push(eq(material.categoryId, categoryId));
    }

    if (supplierId) {
      conditions.push(eq(material.supplierId, supplierId));
    }

    if (type) {
      conditions.push(eq(material.type, type as MaterialType));
    }

    if (search) {
      conditions.push(
        or(
          ilike(material.name, `%${search}%`),
          ilike(material.sku, `%${search}%`),
          ilike(material.description, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(material)
      .where(whereClause);

    const materials = await db
      .select()
      .from(material)
      .where(whereClause)
      .orderBy(desc(material.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      materials,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching materials:', error);

    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    );
  }
}

export async function createMaterialHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createMaterialSchema.parse(body);

    if (validatedData.sku) {
      const existingSku = await db
        .select()
        .from(material)
        .where(eq(material.sku, validatedData.sku))
        .limit(1);

      if (existingSku.length > 0) {
        return NextResponse.json(
          { error: 'A material with this SKU already exists' },
          { status: 400 }
        );
      }
    }

    const defaultCost = validatedData.defaultCost
      ? typeof validatedData.defaultCost === 'number'
        ? validatedData.defaultCost.toString()
        : validatedData.defaultCost
      : undefined;

    const alertThreshold = validatedData.alertThreshold
      ? typeof validatedData.alertThreshold === 'number'
        ? validatedData.alertThreshold.toString()
        : validatedData.alertThreshold
      : undefined;

    const sku =
      validatedData.sku && validatedData.sku.trim() !== ''
        ? validatedData.sku
        : null;

    const newMaterial = await db
      .insert(material)
      .values({
        id: randomUUID(),
        ...validatedData,
        sku,
        defaultCost,
        alertThreshold,
      })
      .returning();

    return NextResponse.json(newMaterial[0], { status: 201 });
  } catch (error) {
    console.error('Error creating material:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create material' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getMaterialsHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});

export const POST = protectRoute(createMaterialHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.CREATE,
});
