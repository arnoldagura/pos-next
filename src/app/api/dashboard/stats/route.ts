import { db } from '@/db/db';
import {
  order,
  orderItem,
  productInventory,
  materialInventory,
  productionOrder,
  materialBatch,
} from '@/drizzle/schema';
import { requireTenantId } from '@/lib/tenant-context';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

function salesQuery(
  tenantId: string,
  start: Date,
  end: Date,
  locationId: string | null
) {
  return db
    .select({
      total: sql<string>`COALESCE(SUM(${order.total}::numeric), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(order)
    .where(
      and(
        gte(order.createdAt, start),
        lte(order.createdAt, end),
        eq(order.status, 'completed'),
        eq(order.organizationId, tenantId),
        locationId ? eq(order.locationId, locationId) : undefined
      )
    );
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');

    // Date range: accept startDate/endDate or default to today
    const now = new Date();
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')! + 'T23:59:59')
      : new Date(now);

    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')! + 'T00:00:00')
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // Previous period: same duration shifted back
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevEnd = new Date(startDate.getTime() - 1); // 1ms before current start
    const prevStart = new Date(prevEnd.getTime() - periodMs);

    // Sales for current and previous period
    const currentSalesQuery = salesQuery(tenantId, startDate, endDate, locationId);
    const previousSalesQuery = salesQuery(tenantId, prevStart, prevEnd, locationId);

    // Order Status Distribution (within selected period)
    const orderStatusQuery = db
      .select({
        status: order.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(order)
      .where(
        and(
          eq(order.organizationId, tenantId),
          gte(order.createdAt, startDate),
          lte(order.createdAt, endDate),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      )
      .groupBy(order.status);

    // Low Stock Products (not time-dependent)
    const lowStockQuery = db
      .select({
        id: productInventory.id,
        productId: productInventory.productId,
        sku: productInventory.sku,
        variantName: productInventory.variantName,
        currentQuantity: productInventory.currentQuantity,
        alertThreshold: productInventory.alertThreshold,
        unitOfMeasure: productInventory.unitOfMeasure,
        locationId: productInventory.locationId,
      })
      .from(productInventory)
      .where(
        and(
          eq(productInventory.organizationId, tenantId),
          sql`${productInventory.currentQuantity}::numeric <= ${productInventory.alertThreshold}::numeric`,
          locationId ? eq(productInventory.locationId, locationId) : undefined
        )
      )
      .limit(10);

    // Recent Orders (within selected period)
    const recentOrdersQuery = db
      .select({
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
      })
      .from(order)
      .where(
        and(
          eq(order.organizationId, tenantId),
          gte(order.createdAt, startDate),
          lte(order.createdAt, endDate),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      )
      .orderBy(desc(order.createdAt))
      .limit(10);

    // Top Selling Products (within selected period)
    const topProductsQuery = db
      .select({
        productId: orderItem.productId,
        productName: orderItem.productName,
        totalQuantity: sql<number>`SUM(${orderItem.quantity})`,
        totalRevenue: sql<string>`SUM(${orderItem.total}::numeric)`,
      })
      .from(orderItem)
      .innerJoin(order, eq(orderItem.orderId, order.id))
      .where(
        and(
          eq(order.organizationId, tenantId),
          gte(order.createdAt, startDate),
          lte(order.createdAt, endDate),
          eq(order.status, 'completed'),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      )
      .groupBy(orderItem.productId, orderItem.productName)
      .orderBy(desc(sql`SUM(${orderItem.total}::numeric)`))
      .limit(5);

    // Production Orders Status (not time-dependent)
    const productionStatusQuery = db
      .select({
        status: productionOrder.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(productionOrder)
      .where(
        and(
          eq(productionOrder.organizationId, tenantId),
          locationId ? eq(productionOrder.locationId, locationId) : undefined
        )
      )
      .groupBy(productionOrder.status);

    // Inventory Value (not time-dependent)
    const inventoryValueQuery = db
      .select({
        totalValue: sql<string>`COALESCE(SUM(${productInventory.currentQuantity}::numeric * ${productInventory.unitPrice}::numeric), 0)`,
        totalItems: sql<number>`COUNT(*)`,
      })
      .from(productInventory)
      .where(
        and(
          eq(productInventory.organizationId, tenantId),
          sql`${productInventory.currentQuantity}::numeric > 0`,
          locationId ? eq(productInventory.locationId, locationId) : undefined
        )
      );

    // Material Expiry Alerts (next 30 days from now)
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const expiringMaterialsQuery = db
      .select({
        id: materialBatch.id,
        materialInventoryId: materialBatch.materialInventoryId,
        batchNumber: materialBatch.batchNumber,
        expiryDate: materialBatch.expiryDate,
        quantity: materialBatch.quantity,
      })
      .from(materialBatch)
      .innerJoin(materialInventory, eq(materialBatch.materialInventoryId, materialInventory.id))
      .where(
        and(
          lte(materialBatch.expiryDate, thirtyDaysLater),
          gte(materialBatch.expiryDate, new Date()),
          sql`${materialBatch.quantity}::numeric > 0`,
          eq(materialInventory.organizationId, tenantId),
          locationId ? eq(materialInventory.locationId, locationId) : undefined
        )
      )
      .orderBy(materialBatch.expiryDate)
      .limit(10);

    // Revenue by Payment Method (within selected period)
    const paymentMethodQuery = db
      .select({
        paymentMethod: order.paymentMethod,
        total: sql<string>`SUM(${order.total}::numeric)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(order)
      .where(
        and(
          eq(order.organizationId, tenantId),
          gte(order.createdAt, startDate),
          lte(order.createdAt, endDate),
          eq(order.status, 'completed'),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      )
      .groupBy(order.paymentMethod);

    // Execute all queries in parallel
    const [
      [currentSales],
      [previousSales],
      orderStatus,
      lowStock,
      recentOrders,
      topProducts,
      productionStatus,
      [inventoryValue],
      expiringMaterials,
      paymentMethods,
    ] = await Promise.all([
      currentSalesQuery,
      previousSalesQuery,
      orderStatusQuery,
      lowStockQuery,
      recentOrdersQuery,
      topProductsQuery,
      productionStatusQuery,
      inventoryValueQuery,
      expiringMaterialsQuery,
      paymentMethodQuery,
    ]);

    // Compute trends
    const curTotal = parseFloat(currentSales?.total || '0');
    const prevTotal = parseFloat(previousSales?.total || '0');
    const curCount = currentSales?.count || 0;
    const prevCount = previousSales?.count || 0;
    const curAvg = curCount > 0 ? curTotal / curCount : 0;
    const prevAvg = prevCount > 0 ? prevTotal / prevCount : 0;

    function trendPercent(current: number, previous: number): number | null {
      if (previous === 0) return current > 0 ? 100 : null;
      return Math.round(((current - previous) / previous) * 100 * 10) / 10;
    }

    return NextResponse.json({
      sales: {
        current: {
          total: currentSales?.total || '0',
          count: curCount,
        },
        previous: {
          total: previousSales?.total || '0',
          count: prevCount,
        },
        averageOrderValue: curAvg.toFixed(2),
        previousAverageOrderValue: prevAvg.toFixed(2),
        trends: {
          revenue: trendPercent(curTotal, prevTotal),
          orders: trendPercent(curCount, prevCount),
          avgOrder: trendPercent(curAvg, prevAvg),
        },
      },
      orderStatus,
      lowStock,
      recentOrders,
      topProducts,
      productionStatus,
      inventory: {
        totalValue: inventoryValue?.totalValue || '0',
        totalItems: inventoryValue?.totalItems || 0,
      },
      expiringMaterials,
      paymentMethods,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics',
      },
      { status: 500 }
    );
  }
}
