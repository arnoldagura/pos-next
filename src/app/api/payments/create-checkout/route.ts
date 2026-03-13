import { createCheckoutSession, isPayMongoConfigured } from '@/lib/paymongo';
import { requireTenantId } from '@/lib/tenant-context';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const checkoutSchema = z.object({
  orderId: z.string().min(1),
  orderNumber: z.string().min(1),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().positive(),
      amount: z.number().positive(), // in PHP (will be converted to centavos)
    })
  ),
  total: z.number().positive(),
  paymentMethod: z.enum(['card', 'gcash', 'maya', 'bank_transfer']),
});

const PAYMENT_METHOD_MAP: Record<string, string[]> = {
  card: ['card'],
  gcash: ['gcash'],
  maya: ['paymaya'],
  bank_transfer: ['dob', 'dob_ubp'],
};

export async function POST(req: NextRequest) {
  try {
    await requireTenantId();

    if (!isPayMongoConfigured()) {
      return NextResponse.json(
        { error: 'Payment gateway not configured' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const data = checkoutSchema.parse(body);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const successUrl = `${appUrl}/pos?payment=success&orderId=${data.orderId}`;
    const cancelUrl = `${appUrl}/pos?payment=cancelled&orderId=${data.orderId}`;

    const lineItems = data.items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      amount: Math.round(item.amount * 100), // Convert PHP to centavos
      currency: 'PHP',
    }));

    const session = await createCheckoutSession({
      description: `Order ${data.orderNumber}`,
      lineItems,
      paymentMethodTypes: PAYMENT_METHOD_MAP[data.paymentMethod] || ['card'],
      successUrl,
      cancelUrl,
      metadata: {
        orderId: data.orderId,
        orderNumber: data.orderNumber,
      },
    });

    return NextResponse.json({
      checkoutUrl: session.checkoutUrl,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating payment checkout:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout' },
      { status: 500 }
    );
  }
}
