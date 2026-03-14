import { db } from '@/drizzle/db';
import { material } from '@/drizzle/schema/materials';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { requireTenantId } from '@/lib/tenant-context';
import { MaterialType } from '@/lib/types';
import { createMaterialSchema } from '@/lib/validations/material';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { and, eq, ilike, or, isNull, count, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function getMaterialsHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions = [eq(material.organizationId, tenantId)];

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

    if (type) {
      conditions.push(eq(material.type, type as MaterialType));
    }

    if (search) {
      const searchCondition = or(
        ilike(material.name, `%${search}%`),
        ilike(material.description, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
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

    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

export async function createMaterialHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await req.json();
    const validatedData = createMaterialSchema.parse(body);

    const newMaterial = await db
      .insert(material)
      .values({
        id: randomUUID(),
        organizationId: tenantId,
        ...validatedData,
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

    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
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
