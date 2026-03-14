import { db } from '@/db/db';
import { order } from '@/drizzle/schema';
import { verifyWebhookSignature } from '@/lib/paymongo';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('paymongo-signature');
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && signature) {
      const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.data?.attributes?.type;

    if (eventType === 'checkout_session.payment.paid') {
      const checkoutData = event.data.attributes.data;
      const metadata = checkoutData.attributes?.metadata;
      const orderId = metadata?.orderId;

      if (orderId) {
        await db
          .update(order)
          .set({
            paymentStatus: 'paid',
            paymentReference: checkoutData.id,
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(order.id, orderId));

        console.log(`[PayMongo Webhook] Order ${orderId} marked as paid`);
      }
    }

    if (eventType === 'payment.failed') {
      const paymentData = event.data.attributes.data;
      const metadata = paymentData.attributes?.metadata;
      const orderId = metadata?.orderId;

      if (orderId) {
        await db
          .update(order)
          .set({
            paymentStatus: 'pending',
            updatedAt: new Date(),
          })
          .where(eq(order.id, orderId));

        console.log(`[PayMongo Webhook] Order ${orderId} payment failed`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
