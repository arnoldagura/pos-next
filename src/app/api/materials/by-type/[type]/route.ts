import { db } from '@/db/db';
import { material } from '@/drizzle/schema/materials';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, isNull, count, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { VALID_MATERIAL_TYPES } from '@/lib/constants/material-types';
import type { MaterialType } from '@/lib/validations/material';

async function getMaterialsByTypeHandler(
  req: NextRequest,
  context: RouteContext<{ type: string }> = createDefaultRouteContext({
    type: '',
  })
) {
  try {
    const { type } = await context.params;

    if (!VALID_MATERIAL_TYPES.includes(type as MaterialType)) {
      return NextResponse.json(
        {
          error: 'Invalid material type',
          validTypes: VALID_MATERIAL_TYPES,
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const supplierId = searchParams.get('supplierId');

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(material.type, type as MaterialType),
      isNull(material.deletedAt),
    ];

    if (statusParam !== null) {
      const status = statusParam === 'true';
      conditions.push(eq(material.status, status));
    }

    if (categoryId) {
      conditions.push(eq(material.categoryId, categoryId));
    }

    if (supplierId) {
      conditions.push(eq(material.supplierId, supplierId));
    }

    const whereClause = and(...conditions);

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
      type,
      materials,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching materials by type:', error);

    return NextResponse.json(
      { error: 'Failed to fetch materials by type' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getMaterialsByTypeHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});
