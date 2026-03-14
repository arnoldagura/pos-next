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

export async function GET(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const weekStart = new Date(now.setDate(now.getDate() - 7));
    const monthStart = new Date(now.setDate(1));

    // Sales Statistics - Today, Week, Month
    const todaySalesQuery = db
      .select({
        total: sql<string>`COALESCE(SUM(${order.total}::numeric), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(order)
      .where(
        and(
          gte(order.createdAt, todayStart),
          eq(order.status, 'completed'),
          eq(order.organizationId, tenantId),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      );

    const weekSalesQuery = db
      .select({
        total: sql<string>`COALESCE(SUM(${order.total}::numeric), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(order)
      .where(
        and(
          gte(order.createdAt, weekStart),
          eq(order.status, 'completed'),
          eq(order.organizationId, tenantId),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      );

    const monthSalesQuery = db
      .select({
        total: sql<string>`COALESCE(SUM(${order.total}::numeric), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(order)
      .where(
        and(
          gte(order.createdAt, monthStart),
          eq(order.status, 'completed'),
          eq(order.organizationId, tenantId),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      );

    // Order Status Distribution
    const orderStatusQuery = db
      .select({
        status: order.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(order)
      .where(
        and(
          eq(order.organizationId, tenantId),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      )
      .groupBy(order.status);

    // Low Stock Products
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

    // Recent Orders
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
          locationId ? eq(order.locationId, locationId) : undefined
        )
      )
      .orderBy(desc(order.createdAt))
      .limit(10);

    // Top Selling Products (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
          gte(order.createdAt, thirtyDaysAgo),
          eq(order.status, 'completed'),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      )
      .groupBy(orderItem.productId, orderItem.productName)
      .orderBy(desc(sql`SUM(${orderItem.total}::numeric)`))
      .limit(5);

    // Production Orders Status
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

    // Inventory Value
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

    // Material Expiry Alerts (Next 30 days)
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
          gte(materialBatch.expiryDate, now),
          sql`${materialBatch.quantity}::numeric > 0`,
          eq(materialInventory.organizationId, tenantId),
          locationId ? eq(materialInventory.locationId, locationId) : undefined
        )
      )
      .orderBy(materialBatch.expiryDate)
      .limit(10);

    // Revenue by Payment Method (Last 30 days)
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
          gte(order.createdAt, thirtyDaysAgo),
          eq(order.status, 'completed'),
          locationId ? eq(order.locationId, locationId) : undefined
        )
      )
      .groupBy(order.paymentMethod);

    // Execute all queries in parallel
    const [
      [todaySales],
      [weekSales],
      [monthSales],
      orderStatus,
      lowStock,
      recentOrders,
      topProducts,
      productionStatus,
      [inventoryValue],
      expiringMaterials,
      paymentMethods,
    ] = await Promise.all([
      todaySalesQuery,
      weekSalesQuery,
      monthSalesQuery,
      orderStatusQuery,
      lowStockQuery,
      recentOrdersQuery,
      topProductsQuery,
      productionStatusQuery,
      inventoryValueQuery,
      expiringMaterialsQuery,
      paymentMethodQuery,
    ]);

    return NextResponse.json({
      sales: {
        today: {
          total: todaySales?.total || '0',
          count: todaySales?.count || 0,
        },
        week: {
          total: weekSales?.total || '0',
          count: weekSales?.count || 0,
        },
        month: {
          total: monthSales?.total || '0',
          count: monthSales?.count || 0,
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
