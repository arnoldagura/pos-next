import { db } from '@/db/db';
import { order } from '@/drizzle/schema';
import { requireTenantId } from '@/lib/tenant-context';
import { retrieveCheckoutSession, isPayMongoConfigured } from '@/lib/paymongo';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    const [orderRecord] = await db
      .select({
        id: order.id,
        paymentStatus: order.paymentStatus,
        paymentReference: order.paymentReference,
        status: order.status,
        orderNumber: order.orderNumber,
      })
      .from(order)
      .where(and(eq(order.id, orderId), eq(order.organizationId, tenantId)));

    if (!orderRecord) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If already paid, return immediately
    if (orderRecord.paymentStatus === 'paid') {
      return NextResponse.json({ status: 'paid', order: orderRecord });
    }

    // If we have a payment reference and PayMongo is configured, check with PayMongo
    if (orderRecord.paymentReference && isPayMongoConfigured()) {
      try {
        const session = await retrieveCheckoutSession(orderRecord.paymentReference);

        if (session.payments?.some((p) => p.attributes.status === 'paid')) {
          // Update order to paid
          await db
            .update(order)
            .set({
              paymentStatus: 'paid',
              status: 'completed',
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(order.id, orderId));

          return NextResponse.json({
            status: 'paid',
            order: { ...orderRecord, paymentStatus: 'paid' },
          });
        }
      } catch (e) {
        console.error('Error checking PayMongo session:', e);
      }
    }

    return NextResponse.json({ status: orderRecord.paymentStatus, order: orderRecord });
  } catch (error) {
    console.error('Error checking payment status:', error);
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 });
  }
}
