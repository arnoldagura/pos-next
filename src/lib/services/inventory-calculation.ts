import { db } from '@/db/db';
import { inventory, inventoryMovement } from '@/drizzle/schema';
import { eq, and, lte, inArray, sql } from 'drizzle-orm';

// Types for service return values
export interface StockLevel {
  inventoryId: string;
  currentStock: number;
  unitOfMeasure: string | null;
}

export interface StockAtDate extends StockLevel {
  calculatedAt: Date;
}

export interface WeightedAverageCost {
  inventoryId: string;
  averageCost: number;
  totalQuantity: number;
}

export interface FIFOCost {
  totalCost: number;
  quantity: number;
  breakdown: Array<{
    date: Date;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface StockValidation {
  inventoryId: string;
  available: boolean;
  currentStock: number;
  requestedQuantity: number;
  shortfall?: number;
}

export interface BulkStockLevels {
  [inventoryId: string]: StockLevel;
}

export interface LowStockItem {
  inventoryId: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  currentStock: number;
  alertThreshold: number;
  difference: number;
  unitOfMeasure: string | null;
}

// Simple in-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class InventoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys()).filter((k) =>
      k.startsWith(pattern)
    );
    keys.forEach((k) => this.cache.delete(k));
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new InventoryCache();

/**
 * Calculate current stock level for an inventory item
 * Stock is derived from all movements (purchases add, sales subtract, etc.)
 */
export async function getCurrentStock(
  inventoryId: string
): Promise<StockLevel | null> {
  const cacheKey = `stock:${inventoryId}`;
  const cached = cache.get<StockLevel>(cacheKey);
  if (cached) return cached;

  const result = await db
    .select({
      inventoryId: inventoryMovement.inventoryId,
      currentStock: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${inventoryMovement.type} IN ('purchase', 'transfer_in', 'production_output', 'receive_from_material', 'adjustment')
              THEN CAST(${inventoryMovement.quantity} AS DECIMAL)
              WHEN ${inventoryMovement.type} IN ('sale', 'transfer_out', 'waste')
              THEN -CAST(${inventoryMovement.quantity} AS DECIMAL)
              ELSE 0
            END
          ),
          0
        )
      `,
      unitOfMeasure: inventory.unitOfMeasure,
    })
    .from(inventoryMovement)
    .innerJoin(inventory, eq(inventoryMovement.inventoryId, inventory.id))
    .where(eq(inventoryMovement.inventoryId, inventoryId))
    .groupBy(inventoryMovement.inventoryId, inventory.unitOfMeasure);

  if (result.length === 0) return null;

  const stockLevel: StockLevel = {
    inventoryId: result[0].inventoryId,
    currentStock: Number(result[0].currentStock),
    unitOfMeasure: result[0].unitOfMeasure,
  };

  cache.set(cacheKey, stockLevel);
  return stockLevel;
}

/**
 * Calculate stock level at a specific date
 * Only includes movements up to and including the specified date
 */
export async function getStockAtDate(
  inventoryId: string,
  date: Date
): Promise<StockAtDate | null> {
  const result = await db
    .select({
      inventoryId: inventoryMovement.inventoryId,
      currentStock: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${inventoryMovement.type} IN ('purchase', 'transfer_in', 'production_output', 'receive_from_material', 'adjustment')
              THEN CAST(${inventoryMovement.quantity} AS DECIMAL)
              WHEN ${inventoryMovement.type} IN ('sale', 'transfer_out', 'waste')
              THEN -CAST(${inventoryMovement.quantity} AS DECIMAL)
              ELSE 0
            END
          ),
          0
        )
      `,
      unitOfMeasure: inventory.unitOfMeasure,
    })
    .from(inventoryMovement)
    .innerJoin(inventory, eq(inventoryMovement.inventoryId, inventory.id))
    .where(
      and(
        eq(inventoryMovement.inventoryId, inventoryId),
        lte(inventoryMovement.date, date)
      )
    )
    .groupBy(inventoryMovement.inventoryId, inventory.unitOfMeasure);

  if (result.length === 0) return null;

  return {
    inventoryId: result[0].inventoryId,
    currentStock: Number(result[0].currentStock),
    unitOfMeasure: result[0].unitOfMeasure,
    calculatedAt: date,
  };
}

/**
 * Calculate weighted average cost of inventory
 * Only considers purchase movements with unit prices
 */
export async function getWeightedAverageCost(
  inventoryId: string
): Promise<WeightedAverageCost | null> {
  const cacheKey = `wac:${inventoryId}`;
  const cached = cache.get<WeightedAverageCost>(cacheKey);
  if (cached) return cached;

  const result = await db
    .select({
      inventoryId: inventoryMovement.inventoryId,
      totalCost: sql<number>`
        COALESCE(
          SUM(CAST(${inventoryMovement.quantity} AS DECIMAL) * CAST(${inventoryMovement.unitPrice} AS DECIMAL)),
          0
        )
      `,
      totalQuantity: sql<number>`
        COALESCE(
          SUM(CAST(${inventoryMovement.quantity} AS DECIMAL)),
          0
        )
      `,
    })
    .from(inventoryMovement)
    .where(
      and(
        eq(inventoryMovement.inventoryId, inventoryId),
        sql`${inventoryMovement.type} IN ('purchase', 'transfer_in', 'production_output')`,
        sql`${inventoryMovement.unitPrice} IS NOT NULL`
      )
    )
    .groupBy(inventoryMovement.inventoryId);

  if (result.length === 0 || Number(result[0].totalQuantity) === 0) {
    return null;
  }

  const totalCost = Number(result[0].totalCost);
  const totalQuantity = Number(result[0].totalQuantity);
  const averageCost = totalCost / totalQuantity;

  const wac: WeightedAverageCost = {
    inventoryId: result[0].inventoryId,
    averageCost,
    totalQuantity,
  };

  cache.set(cacheKey, wac);
  return wac;
}

/**
 * Calculate FIFO (First In, First Out) cost for a specific quantity
 * Returns the cost breakdown using oldest inventory first
 */
export async function getFIFOCost(
  inventoryId: string,
  quantity: number
): Promise<FIFOCost | null> {
  // Get all purchase movements ordered by date (oldest first)
  const movements = await db
    .select({
      date: inventoryMovement.date,
      quantity: inventoryMovement.quantity,
      unitPrice: inventoryMovement.unitPrice,
    })
    .from(inventoryMovement)
    .where(
      and(
        eq(inventoryMovement.inventoryId, inventoryId),
        sql`${inventoryMovement.type} IN ('purchase', 'transfer_in', 'production_output')`,
        sql`${inventoryMovement.unitPrice} IS NOT NULL`
      )
    )
    .orderBy(inventoryMovement.date);

  if (movements.length === 0) return null;

  let remainingQuantity = quantity;
  let totalCost = 0;
  const breakdown: FIFOCost['breakdown'] = [];

  for (const movement of movements) {
    if (remainingQuantity <= 0) break;

    const movementQty = Number(movement.quantity);
    const unitPrice = Number(movement.unitPrice);
    const qtyToUse = Math.min(remainingQuantity, movementQty);
    const cost = qtyToUse * unitPrice;

    totalCost += cost;
    remainingQuantity -= qtyToUse;

    breakdown.push({
      date: movement.date,
      quantity: qtyToUse,
      unitPrice,
      totalPrice: cost,
    });
  }

  return {
    totalCost,
    quantity: quantity - remainingQuantity,
    breakdown,
  };
}

/**
 * Validate if sufficient stock is available for a transaction
 */
export async function validateStockAvailability(
  inventoryId: string,
  quantity: number
): Promise<StockValidation> {
  const stockLevel = await getCurrentStock(inventoryId);

  if (!stockLevel) {
    return {
      inventoryId,
      available: false,
      currentStock: 0,
      requestedQuantity: quantity,
      shortfall: quantity,
    };
  }

  const available = stockLevel.currentStock >= quantity;

  return {
    inventoryId,
    available,
    currentStock: stockLevel.currentStock,
    requestedQuantity: quantity,
    shortfall: available ? undefined : quantity - stockLevel.currentStock,
  };
}

/**
 * Get stock levels for multiple inventory items in bulk
 * More efficient than calling getCurrentStock multiple times
 */
export async function getBulkStockLevels(
  inventoryIds: string[]
): Promise<BulkStockLevels> {
  if (inventoryIds.length === 0) return {};

  const results = await db
    .select({
      inventoryId: inventoryMovement.inventoryId,
      currentStock: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${inventoryMovement.type} IN ('purchase', 'transfer_in', 'production_output', 'receive_from_material', 'adjustment')
              THEN CAST(${inventoryMovement.quantity} AS DECIMAL)
              WHEN ${inventoryMovement.type} IN ('sale', 'transfer_out', 'waste')
              THEN -CAST(${inventoryMovement.quantity} AS DECIMAL)
              ELSE 0
            END
          ),
          0
        )
      `,
      unitOfMeasure: inventory.unitOfMeasure,
    })
    .from(inventoryMovement)
    .innerJoin(inventory, eq(inventoryMovement.inventoryId, inventory.id))
    .where(inArray(inventoryMovement.inventoryId, inventoryIds))
    .groupBy(inventoryMovement.inventoryId, inventory.unitOfMeasure);

  const bulkLevels: BulkStockLevels = {};

  for (const result of results) {
    bulkLevels[result.inventoryId] = {
      inventoryId: result.inventoryId,
      currentStock: Number(result.currentStock),
      unitOfMeasure: result.unitOfMeasure,
    };
  }

  return bulkLevels;
}

/**
 * Get all items at a location that are below their alert threshold
 */
export async function getLowStockItems(
  locationId: string
): Promise<LowStockItem[]> {
  const cacheKey = `lowstock:${locationId}`;
  const cached = cache.get<LowStockItem[]>(cacheKey);
  if (cached) return cached;

  const results = await db
    .select({
      inventoryId: inventory.id,
      productId: inventory.productId,
      productName: sql<string>`product.name`,
      locationId: inventory.locationId,
      locationName: sql<string>`location.name`,
      currentStock: sql<number>`
        COALESCE(
          SUM(
            CASE
              WHEN ${inventoryMovement.type} IN ('purchase', 'transfer_in', 'production_output', 'receive_from_material', 'adjustment')
              THEN CAST(${inventoryMovement.quantity} AS DECIMAL)
              WHEN ${inventoryMovement.type} IN ('sale', 'transfer_out', 'waste')
              THEN -CAST(${inventoryMovement.quantity} AS DECIMAL)
              ELSE 0
            END
          ),
          0
        )
      `,
      alertThreshold: inventory.alertThreshold,
      unitOfMeasure: inventory.unitOfMeasure,
    })
    .from(inventory)
    .innerJoin(
      sql`product`,
      sql`product.id = ${inventory.productId}`
    )
    .innerJoin(
      sql`location`,
      sql`location.id = ${inventory.locationId}`
    )
    .leftJoin(inventoryMovement, eq(inventoryMovement.inventoryId, inventory.id))
    .where(eq(inventory.locationId, locationId))
    .groupBy(
      inventory.id,
      inventory.productId,
      sql`product.name`,
      inventory.locationId,
      sql`location.name`,
      inventory.alertThreshold,
      inventory.unitOfMeasure
    )
    .having(
      sql`COALESCE(
        SUM(
          CASE
            WHEN ${inventoryMovement.type} IN ('purchase', 'transfer_in', 'production_output', 'receive_from_material', 'adjustment')
            THEN CAST(${inventoryMovement.quantity} AS DECIMAL)
            WHEN ${inventoryMovement.type} IN ('sale', 'transfer_out', 'waste')
            THEN -CAST(${inventoryMovement.quantity} AS DECIMAL)
            ELSE 0
          END
        ),
        0
      ) <= CAST(${inventory.alertThreshold} AS DECIMAL)`
    );

  const lowStockItems: LowStockItem[] = results.map((result) => ({
    inventoryId: result.inventoryId,
    productId: result.productId,
    productName: result.productName,
    locationId: result.locationId,
    locationName: result.locationName,
    currentStock: Number(result.currentStock),
    alertThreshold: Number(result.alertThreshold),
    difference: Number(result.alertThreshold) - Number(result.currentStock),
    unitOfMeasure: result.unitOfMeasure,
  }));

  cache.set(cacheKey, lowStockItems);
  return lowStockItems;
}

/**
 * Invalidate cache for a specific inventory item
 * Call this after creating new movements
 */
export function invalidateInventoryCache(inventoryId: string): void {
  cache.invalidate(`stock:${inventoryId}`);
  cache.invalidate(`wac:${inventoryId}`);
}

/**
 * Invalidate cache for a location's low stock items
 * Call this after movements at a location
 */
export function invalidateLocationCache(locationId: string): void {
  cache.invalidate(`lowstock:${locationId}`);
}

/**
 * Clear all inventory caches
 */
export function clearInventoryCache(): void {
  cache.clear();
}
