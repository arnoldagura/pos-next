import { db } from '@/db/db';
import { order, orderItem, location } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    const [orderData] = await db
      .select({
        id: order.id,
        orderNumber: order.orderNumber,
        locationId: order.locationId,
        tableId: order.tableId,
        customerId: order.customerId,
        customerName: order.customerName,
        status: order.status,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        subtotal: order.subtotal,
        totalDiscount: order.totalDiscount,
        totalTax: order.totalTax,
        total: order.total,
        amountPaid: order.amountPaid,
        changeGiven: order.changeGiven,
        notes: order.notes,
        createdAt: order.createdAt,
        completedAt: order.completedAt,
        cancelledAt: order.cancelledAt,
        locationName: location.name,
        locationAddress: location.address,
        locationPhone: location.phone,
      })
      .from(order)
      .leftJoin(location, eq(order.locationId, location.id))
      .where(eq(order.id, orderId))
      .limit(1);

    if (!orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const items = await db
      .select()
      .from(orderItem)
      .where(eq(orderItem.orderId, orderId));

    return NextResponse.json({
      order: orderData,
      items,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
