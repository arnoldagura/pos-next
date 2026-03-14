import { db } from '@/db/db';
import { materialInventory, materialInventoryMovement, materialBatch } from '@/drizzle/schema';
import { eq, inArray, sql } from 'drizzle-orm';

export interface MaterialStockLevel {
  materialInventoryId: string;
  currentStock: number;
  unitOfMeasure: string | null;
}

export interface BulkMaterialStockLevels {
  [materialInventoryId: string]: MaterialStockLevel;
}

export async function getMaterialCurrentStock(
  materialInventoryId: string
): Promise<MaterialStockLevel | null> {
  const result = await db
    .select({
      materialInventoryId: materialInventoryMovement.materialInventoryId,
      currentStock: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${materialInventoryMovement.type} IN ('purchase', 'transfer_in', 'adjustment')
              THEN CAST(${materialInventoryMovement.quantity} AS DECIMAL)
              WHEN ${materialInventoryMovement.type} IN ('production_consumption', 'waste', 'expired', 'transfer_out', 'transfer_to_pos')
              THEN -CAST(${materialInventoryMovement.quantity} AS DECIMAL)
              ELSE 0
            END
          ),
          0
        )
      `,
      unitOfMeasure: materialInventory.unitOfMeasure,
    })
    .from(materialInventoryMovement)
    .innerJoin(
      materialInventory,
      eq(materialInventoryMovement.materialInventoryId, materialInventory.id)
    )
    .where(eq(materialInventoryMovement.materialInventoryId, materialInventoryId))
    .groupBy(materialInventoryMovement.materialInventoryId, materialInventory.unitOfMeasure);

  if (result.length === 0) return null;

  return {
    materialInventoryId: result[0].materialInventoryId,
    currentStock: Number(result[0].currentStock),
    unitOfMeasure: result[0].unitOfMeasure,
  };
}

export async function getBulkMaterialStockLevels(
  materialInventoryIds: string[]
): Promise<BulkMaterialStockLevels> {
  if (materialInventoryIds.length === 0) return {};

  const results = await db
    .select({
      materialInventoryId: materialInventoryMovement.materialInventoryId,
      currentStock: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${materialInventoryMovement.type} IN ('purchase', 'transfer_in', 'adjustment')
              THEN CAST(${materialInventoryMovement.quantity} AS DECIMAL)
              WHEN ${materialInventoryMovement.type} IN ('production_consumption', 'waste', 'expired', 'transfer_out', 'transfer_to_pos')
              THEN -CAST(${materialInventoryMovement.quantity} AS DECIMAL)
              ELSE 0
            END
          ),
          0
        )
      `,
      unitOfMeasure: materialInventory.unitOfMeasure,
    })
    .from(materialInventoryMovement)
    .innerJoin(
      materialInventory,
      eq(materialInventoryMovement.materialInventoryId, materialInventory.id)
    )
    .where(inArray(materialInventoryMovement.materialInventoryId, materialInventoryIds))
    .groupBy(materialInventoryMovement.materialInventoryId, materialInventory.unitOfMeasure);

  const bulkLevels: BulkMaterialStockLevels = {};

  for (const result of results) {
    bulkLevels[result.materialInventoryId] = {
      materialInventoryId: result.materialInventoryId,
      currentStock: Number(result.currentStock),
      unitOfMeasure: result.unitOfMeasure,
    };
  }

  return bulkLevels;
}

export async function getMaterialBatchesTotalStock(materialInventoryId: string): Promise<number> {
  const result = await db
    .select({
      totalStock: sql<number>`COALESCE(SUM(CAST(${materialBatch.quantity} AS DECIMAL)), 0)`,
    })
    .from(materialBatch)
    .where(eq(materialBatch.materialInventoryId, materialInventoryId));

  return result.length > 0 ? Number(result[0].totalStock) : 0;
}
