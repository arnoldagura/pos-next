import { db } from '@/db/db';
import { order, orderItem, location, orderStatusEnum } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/tenant-context';

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['processing', 'ready', 'completed', 'cancelled'],
  processing: ['pending', 'ready', 'completed', 'cancelled'],
  ready: ['pending', 'processing', 'completed', 'cancelled'],
  completed: ['ready', 'cancelled'],
  cancelled: ['pending', 'processing', 'ready'],
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await requireTenantId();
    const { id: orderId } = await params;

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
      .where(and(eq(order.id, orderId), eq(order.organizationId, tenantId)))
      .limit(1);

    if (!orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const items = await db.select().from(orderItem).where(eq(orderItem.orderId, orderId));

    return NextResponse.json({
      order: orderData,
      items,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await requireTenantId();
    const { id: orderId } = await params;
    const body = await req.json();
    const { status: newStatus } = body;

    if (!newStatus || !orderStatusEnum.enumValues.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Fetch current order
    const [existing] = await db
      .select({ status: order.status })
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.organizationId, tenantId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Validate status transition
    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from "${existing.status}" to "${newStatus}"` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'completed') {
      updateData.completedAt = new Date();
    }
    if (newStatus === 'cancelled') {
      updateData.cancelledAt = new Date();
    }

    const [updated] = await db
      .update(order)
      .set(updateData)
      .where(and(eq(order.id, orderId), eq(order.organizationId, tenantId)))
      .returning();

    return NextResponse.json({ order: updated });
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
