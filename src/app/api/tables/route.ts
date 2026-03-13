import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { restaurantTable } from '@/drizzle/schema';
import { eq, ilike, or, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { createTableSchema, type TableStatus } from '@/lib/validations';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { requireTenantId } from '@/lib/tenant-context';

async function getTablesHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const locationId = searchParams.get('locationId');
    const search = searchParams.get('search');

    const query = db.select().from(restaurantTable);

    const conditions = [eq(restaurantTable.organizationId, tenantId)];

    if (statusParam) {
      const statuses = statusParam
        .split(',')
        .map((s) => s.trim()) as TableStatus[];
      if (statuses.length === 1) {
        conditions.push(eq(restaurantTable.status, statuses[0]));
      } else if (statuses.length > 1) {
        const statusCondition = or(...statuses.map((status) => eq(restaurantTable.status, status)));
        if (statusCondition) conditions.push(statusCondition);
      }
    }

    if (locationId) {
      conditions.push(eq(restaurantTable.locationId, locationId));
    }

    if (search) {
      const searchCondition = or(
        ilike(restaurantTable.name, `%${search}%`),
        ilike(restaurantTable.number, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const tables = await query.where(
      conditions.length > 0 ? and(...conditions) : undefined
    );

    return NextResponse.json({ data: tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

async function createTableHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await req.json();
    const validatedData = createTableSchema.parse(body);

    const newTable = await db
      .insert(restaurantTable)
      .values({
        id: randomUUID(),
        organizationId: tenantId,
        ...validatedData,
      })
      .returning();

    return NextResponse.json(newTable[0], { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating table:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    );
  }
}

// GET /api/tables - List all tables
export const GET = protectRoute(getTablesHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.READ,
});

// POST /api/tables - Create table
export const POST = protectRoute(createTableHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});
