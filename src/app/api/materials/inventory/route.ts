import { db } from '@/db/db';
import { materialInventory, material, location } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, count, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getBulkMaterialStockLevels } from '@/lib/services/material-inventory-calculation';

export async function getMaterialInventoryHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const materialId = searchParams.get('materialId');

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (locationId) {
      conditions.push(eq(materialInventory.locationId, locationId));
    }

    if (materialId) {
      conditions.push(eq(materialInventory.materialId, materialId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ totalCount }] = await db
      .select({ totalCount: count() })
      .from(materialInventory)
      .where(whereClause);

    const inventoryRecords = await db
      .select({
        id: materialInventory.id,
        materialId: materialInventory.materialId,
        materialName: material.name,
        materialSku: material.sku,
        materialType: material.type,
        locationId: materialInventory.locationId,
        locationName: location.name,
        alertThreshold: materialInventory.alertThreshold,
        unitOfMeasure: materialInventory.unitOfMeasure,
        createdAt: materialInventory.createdAt,
        updatedAt: materialInventory.updatedAt,
      })
      .from(materialInventory)
      .innerJoin(material, eq(materialInventory.materialId, material.id))
      .innerJoin(location, eq(materialInventory.locationId, location.id))
      .where(whereClause)
      .orderBy(desc(materialInventory.createdAt))
      .limit(limit)
      .offset(offset);

    const inventoryIds = inventoryRecords.map((inv) => inv.id);
    const stockLevels = await getBulkMaterialStockLevels(inventoryIds);

    const inventoryWithStock = inventoryRecords.map((inv) => ({
      ...inv,
      currentStock: stockLevels[inv.id]?.currentStock || 0,
      belowThreshold:
        (stockLevels[inv.id]?.currentStock || 0) <= Number(inv.alertThreshold),
    }));

    return NextResponse.json({
      inventory: inventoryWithStock,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching material inventory:', error);

    return NextResponse.json(
      { error: 'Failed to fetch material inventory' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getMaterialInventoryHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});
