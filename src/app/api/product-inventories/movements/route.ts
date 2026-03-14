import { db } from '@/db/db';
import { productInventoryMovement } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { MovementType } from '@/lib/validations/product';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, count, desc, gte, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function getMovementsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inventoryId = searchParams.get('inventoryId');
    const type = searchParams.get('type') as MovementType | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (inventoryId) {
      conditions.push(eq(productInventoryMovement.productInventoryId, inventoryId));
    }

    if (type) {
      conditions.push(sql`${productInventoryMovement.type} = ${type}`);
    }

    if (startDate) {
      const start = new Date(startDate);
      conditions.push(gte(productInventoryMovement.date, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      conditions.push(lte(productInventoryMovement.date, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(productInventoryMovement)
      .where(whereClause);

    const movements = await db
      .select()
      .from(productInventoryMovement)
      .where(whereClause)
      .orderBy(desc(productInventoryMovement.date), desc(productInventoryMovement.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      data: movements,
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error('Error fetching movements:', error);

    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}

// GET /api/product-inventories/movements - Movement history
export const GET = protectRoute(getMovementsHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});
