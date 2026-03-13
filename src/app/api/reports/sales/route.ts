import { db } from '@/db/db';
import { order, orderItem, location } from '@/drizzle/schema';
import { requireTenantId } from '@/lib/tenant-context';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');
    const reportType = searchParams.get('type') || 'summary';

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const conditions = [
      eq(order.organizationId, tenantId),
      gte(order.createdAt, start),
      lte(order.createdAt, end),
      eq(order.status, 'completed'),
    ];

    if (locationId) {
      conditions.push(eq(order.locationId, locationId));
    }

    const whereClause = and(...conditions);

    if (reportType === 'summary') {
      // Summary Report
      const [summary] = await db
        .select({
          totalSales: sql<string>`COALESCE(SUM(${order.total}::numeric), 0)`,
          totalOrders: sql<number>`COUNT(*)`,
          totalDiscount: sql<string>`COALESCE(SUM(${order.totalDiscount}::numeric), 0)`,
          totalTax: sql<string>`COALESCE(SUM(${order.totalTax}::numeric), 0)`,
          avgOrderValue: sql<string>`COALESCE(AVG(${order.total}::numeric), 0)`,
        })
        .from(order)
        .where(whereClause);

      // Sales by payment method
      const paymentBreakdown = await db
        .select({
          paymentMethod: order.paymentMethod,
          total: sql<string>`SUM(${order.total}::numeric)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(order)
        .where(whereClause)
        .groupBy(order.paymentMethod);

      // Top products
      const topProducts = await db
        .select({
          productId: orderItem.productId,
          productName: orderItem.productName,
          totalQuantity: sql<number>`SUM(${orderItem.quantity})`,
          totalRevenue: sql<string>`SUM(${orderItem.total}::numeric)`,
        })
        .from(orderItem)
        .innerJoin(order, eq(orderItem.orderId, order.id))
        .where(whereClause)
        .groupBy(orderItem.productId, orderItem.productName)
        .orderBy(desc(sql`SUM(${orderItem.total}::numeric)`))
        .limit(10);

      return NextResponse.json({
        summary,
        paymentBreakdown,
        topProducts,
        period: { startDate, endDate },
      });
    } else if (reportType === 'detailed') {
      // Detailed Report
      const orders = await db
        .select({
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          locationName: location.name,
          status: order.status,
          paymentMethod: order.paymentMethod,
          subtotal: order.subtotal,
          totalDiscount: order.totalDiscount,
          totalTax: order.totalTax,
          total: order.total,
          createdAt: order.createdAt,
          completedAt: order.completedAt,
        })
        .from(order)
        .leftJoin(location, eq(order.locationId, location.id))
        .where(whereClause)
        .orderBy(desc(order.createdAt));

      return NextResponse.json({
        orders,
        period: { startDate, endDate },
      });
    } else if (reportType === 'daily') {
      // Daily Sales Report
      const dailySales = await db
        .select({
          date: sql<string>`DATE(${order.createdAt})`,
          totalSales: sql<string>`SUM(${order.total}::numeric)`,
          totalOrders: sql<number>`COUNT(*)`,
          avgOrderValue: sql<string>`AVG(${order.total}::numeric)`,
        })
        .from(order)
        .where(whereClause)
        .groupBy(sql`DATE(${order.createdAt})`)
        .orderBy(sql`DATE(${order.createdAt})`);

      return NextResponse.json({
        dailySales,
        period: { startDate, endDate },
      });
    } else if (reportType === 'category') {
      // Category Performance (if you have product categories)
      const categoryPerformance = await db
        .select({
          productName: orderItem.productName,
          totalQuantity: sql<number>`SUM(${orderItem.quantity})`,
          totalRevenue: sql<string>`SUM(${orderItem.total}::numeric)`,
        })
        .from(orderItem)
        .innerJoin(order, eq(orderItem.orderId, order.id))
        .where(whereClause)
        .groupBy(orderItem.productName)
        .orderBy(desc(sql`SUM(${orderItem.total}::numeric)`));

      return NextResponse.json({
        categoryPerformance,
        period: { startDate, endDate },
      });
    }

    return NextResponse.json(
      { error: 'Invalid report type' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error generating sales report:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate sales report',
      },
      { status: 500 }
    );
  }
}
