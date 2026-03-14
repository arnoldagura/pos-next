import { db } from '@/db/db';
import { order, orderItem, restaurantTable } from '@/drizzle/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/tenant-context';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');

    const conditions = [
      eq(order.organizationId, tenantId),
      inArray(order.status, ['pending', 'processing', 'ready']),
    ];

    if (locationId) {
      conditions.push(eq(order.locationId, locationId));
    }

    const orders = await db
      .select({
        id: order.id,
        orderNumber: order.orderNumber,
        locationId: order.locationId,
        tableId: order.tableId,
        customerName: order.customerName,
        status: order.status,
        notes: order.notes,
        createdAt: order.createdAt,
        tableName: restaurantTable.name,
      })
      .from(order)
      .leftJoin(restaurantTable, eq(order.tableId, restaurantTable.id))
      .where(and(...conditions))
      .orderBy(desc(order.createdAt));

    // Fetch items for all orders in one query
    const orderIds = orders.map((o) => o.id);

    let items: {
      id: string;
      orderId: string;
      productName: string;
      quantity: number;
      itemStatus: string;
      notes: string | null;
    }[] = [];

    if (orderIds.length > 0) {
      items = await db
        .select({
          id: orderItem.id,
          orderId: orderItem.orderId,
          productName: orderItem.productName,
          quantity: orderItem.quantity,
          itemStatus: orderItem.itemStatus,
          notes: orderItem.notes,
        })
        .from(orderItem)
        .where(inArray(orderItem.orderId, orderIds));
    }

    // Group items by orderId
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      const existing = itemsByOrder.get(item.orderId) || [];
      existing.push(item);
      itemsByOrder.set(item.orderId, existing);
    }

    const result = orders.map((o) => ({
      ...o,
      items: itemsByOrder.get(o.id) || [],
    }));

    return NextResponse.json({ orders: result });
  } catch (error) {
    console.error('Error fetching kitchen orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch kitchen orders' },
      { status: 500 }
    );
  }
}
