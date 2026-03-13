import { db } from '@/drizzle/db';
import { supplier } from '@/drizzle/schema/suppliers';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { requireTenantId } from '@/lib/tenant-context';
import { createSupplierSchema } from '@/lib/validations/supplier';
import { protectRoute } from '@/middleware/rbac';
import { randomUUID } from 'crypto';
import { and, eq, ilike, or } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export async function getSuppliersHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const isActiveParam = searchParams.get('isActive');
    const search = searchParams.get('search');

    const query = db.select().from(supplier);

    const conditions = [eq(supplier.organizationId, tenantId)];

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      conditions.push(eq(supplier.isActive, isActive));
    }

    if (search) {
      const searchCondition = or(
        ilike(supplier.name, `%${search}%`),
        ilike(supplier.contactPerson, `%${search}%`),
        ilike(supplier.phone, `%${search}%`),
        ilike(supplier.address, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const suppliers = await query.where(
      and(...conditions)
    );

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);

    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

export async function createSupplierHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await req.json();
    const validatedData = createSupplierSchema.parse(body);

    const newSupplier = await db
      .insert(supplier)
      .values({
        id: randomUUID(),
        organizationId: tenantId,
        ...validatedData,
      })
      .returning();

    return NextResponse.json(newSupplier[0], { status: 201 });
  } catch (error) {
    console.error('Error creating supplier:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create supplier' },
      { status: 500 }
    );
  }
}

// GET /api/suppliers - List all suppliers
export const GET = protectRoute(getSuppliersHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.READ,
});

// POST /api/suppliers - Create a new supplier
export const POST = protectRoute(createSupplierHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.CREATE,
});
