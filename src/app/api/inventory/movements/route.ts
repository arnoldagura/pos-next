import { db } from '@/db/db';
import { inventoryMovement } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, count, desc, gte, lte, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import type { MovementType } from '@/lib/validations/inventory';

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
      conditions.push(eq(inventoryMovement.inventoryId, inventoryId));
    }

    if (type) {
      conditions.push(sql`${inventoryMovement.type} = ${type}`);
    }

    if (startDate) {
      const start = new Date(startDate);
      conditions.push(gte(inventoryMovement.date, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      conditions.push(lte(inventoryMovement.date, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(inventoryMovement)
      .where(whereClause);

    const movements = await db
      .select()
      .from(inventoryMovement)
      .where(whereClause)
      .orderBy(desc(inventoryMovement.date), desc(inventoryMovement.createdAt))
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

    return NextResponse.json(
      { error: 'Failed to fetch movements' },
      { status: 500 }
    );
  }
}

// GET /api/inventory/movements - Movement history
export const GET = protectRoute(getMovementsHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});
