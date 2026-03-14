import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { materialInventory } from '@/drizzle/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { requireTenantId } from '@/lib/tenant-context';

const createMaterialInventorySchema = z.object({
  materialId: z.string().min(1, 'Material is required'),
  locationId: z.string().min(1, 'Location is required'),
  variantName: z.string().optional(),
  sku: z.string().optional(),
  defaultSupplierId: z.string().optional().nullable(),
  currentQuantity: z.number().optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  cost: z.number().min(0).optional(),
  alertThreshold: z.number().nonnegative('Alert threshold must be non-negative').optional(),
});

// GET /api/material-inventories - List material inventories with filters
export async function GET(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const materialId = searchParams.get('materialId');
    const locationId = searchParams.get('locationId');
    const search = searchParams.get('search');

    const whereConditions = [eq(materialInventory.organizationId, tenantId)];

    if (materialId) {
      whereConditions.push(eq(materialInventory.materialId, materialId));
    }

    if (locationId) {
      whereConditions.push(eq(materialInventory.locationId, locationId));
    }

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(materialInventory)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const total = Number(countResult[0]?.count || 0);

    const inventories = await db.query.materialInventory.findMany({
      where: whereConditions.length > 0 ? and(...whereConditions) : undefined,
      with: {
        material: {
          columns: {
            id: true,
            name: true,
            type: true,
            image: true,
          },
          with: {
            category: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        location: {
          columns: {
            id: true,
            name: true,
          },
        },
        supplier: {
          columns: {
            id: true,
            name: true,
          },
        },
        batches: {
          columns: {
            id: true,
            batchNumber: true,
            quantity: true,
            cost: true,
            expiryDate: true,
            createdAt: true,
          },
          orderBy: (batches, { asc }) => [asc(batches.expiryDate)],
        },
      },
      limit,
      offset,
      orderBy: [desc(materialInventory.updatedAt)],
    });

    let filteredInventories = inventories;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredInventories = inventories.filter(
        (inv) =>
          inv.material.name.toLowerCase().includes(searchLower) ||
          inv.sku?.toLowerCase().includes(searchLower) ||
          inv.variantName?.toLowerCase().includes(searchLower) ||
          inv.location.name.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      data: filteredInventories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching material inventories:', error);
    return NextResponse.json({ error: 'Failed to fetch material inventories' }, { status: 500 });
  }
}

// POST /api/material-inventories - Create new material inventory
export async function POST(request: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await request.json();

    const validation = createMaterialInventorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      materialId,
      locationId,
      variantName,
      sku,
      defaultSupplierId,
      unitOfMeasure,
      cost,
      currentQuantity,
      alertThreshold,
    } = validation.data;

    const existing = await db.query.materialInventory.findFirst({
      where: and(
        eq(materialInventory.organizationId, tenantId),
        eq(materialInventory.materialId, materialId),
        eq(materialInventory.locationId, locationId)
      ),
    });

    if (existing) {
      return NextResponse.json(
        {
          error: 'Material inventory already exists for this material and location',
        },
        { status: 400 }
      );
    }

    const [newInventory] = await db
      .insert(materialInventory)
      .values({
        id: randomUUID(),
        organizationId: tenantId,
        materialId,
        locationId,
        variantName: variantName || null,
        sku: sku || null,
        defaultSupplierId: defaultSupplierId || null,
        unitOfMeasure,
        cost: cost?.toString(),
        currentQuantity: currentQuantity?.toString() ?? '0.00',
        alertThreshold: alertThreshold?.toString() || '0',
      })
      .returning();

    const inventory = await db.query.materialInventory.findFirst({
      where: eq(materialInventory.id, newInventory.id),
      with: {
        material: {
          with: {
            category: true,
          },
        },
        supplier: true,
        location: true,
        batches: true,
      },
    });

    return NextResponse.json(inventory, { status: 201 });
  } catch (error) {
    console.error('Error creating material inventory:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create material inventory' }, { status: 500 });
  }
}
