import { db } from '@/db/db';
import {
  materialBatch,
  materialInventory,
  material,
  location,
} from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, lte, gte, isNotNull, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function getExpiringMaterialsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const locationId = searchParams.get('locationId');

    const days = daysParam ? parseInt(daysParam, 10) : 30;

    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);

    const conditions = [
      isNotNull(materialBatch.expiryDate),
      lte(materialBatch.expiryDate, futureDate),
      gte(materialBatch.expiryDate, today),
      sql`CAST(${materialBatch.quantity} AS DECIMAL) > 0`,
    ];

    if (locationId) {
      conditions.push(eq(materialInventory.locationId, locationId));
    }

    const expiringBatches = await db
      .select({
        batchId: materialBatch.id,
        batchNumber: materialBatch.batchNumber,
        expiryDate: materialBatch.expiryDate,
        quantity: materialBatch.quantity,
        cost: materialBatch.cost,
        materialInventoryId: materialBatch.materialInventoryId,
        materialId: material.id,
        materialName: material.name,
        materialInventorySku: materialInventory.sku,
        materialType: material.type,
        locationId: materialInventory.locationId,
        locationName: location.name,
        unitOfMeasure: materialInventory.unitOfMeasure,
        daysUntilExpiry: sql<number>`
          EXTRACT(DAY FROM (${materialBatch.expiryDate} - CURRENT_DATE))
        `,
      })
      .from(materialBatch)
      .innerJoin(
        materialInventory,
        eq(materialBatch.materialInventoryId, materialInventory.id)
      )
      .innerJoin(material, eq(materialInventory.materialId, material.id))
      .innerJoin(location, eq(materialInventory.locationId, location.id))
      .where(and(...conditions))
      .orderBy(materialBatch.expiryDate);

    return NextResponse.json({
      expiringBatches,
      criteria: {
        daysAhead: days,
        fromDate: today.toISOString(),
        toDate: futureDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching expiring materials:', error);

    return NextResponse.json(
      { error: 'Failed to fetch expiring materials' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getExpiringMaterialsHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});
