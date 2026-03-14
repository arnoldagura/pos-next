const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || '';
const PAYMONGO_BASE_URL = 'https://api.paymongo.com/v1';

function getHeaders() {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
  };
}

export interface CheckoutLineItem {
  name: string;
  quantity: number;
  amount: number; // in centavos (e.g., 10000 = PHP 100.00)
  currency: string;
}

export interface CreateCheckoutParams {
  description: string;
  lineItems: CheckoutLineItem[];
  paymentMethodTypes: string[];
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

export async function createCheckoutSession(params: CreateCheckoutParams) {
  const response = await fetch(`${PAYMONGO_BASE_URL}/checkout_sessions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: params.description,
          line_items: params.lineItems,
          payment_method_types: params.paymentMethodTypes,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
          metadata: params.metadata,
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to create checkout session');
  }

  const data = await response.json();
  return {
    id: data.data.id as string,
    checkoutUrl: data.data.attributes.checkout_url as string,
  };
}

export async function retrieveCheckoutSession(sessionId: string) {
  const response = await fetch(`${PAYMONGO_BASE_URL}/checkout_sessions/${sessionId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.errors?.[0]?.detail || 'Failed to retrieve checkout session');
  }

  const data = await response.json();
  const attrs = data.data.attributes;

  return {
    id: data.data.id as string,
    status: attrs.status as string,
    paymentMethodUsed: attrs.payment_method_used as string | null,
    payments: attrs.payments as Array<{
      id: string;
      type: string;
      attributes: {
        amount: number;
        status: string;
        paid_at: string;
        fee: number;
        net_amount: number;
      };
    }>,
    metadata: attrs.metadata as Record<string, string> | null,
  };
}

export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string
): Promise<boolean> {
  const { createHmac } = await import('crypto');
  const parts = signatureHeader.split(',');
  const timestamp = parts.find((p: string) => p.startsWith('t='))?.split('=')[1];
  const testSig = parts.find((p: string) => p.startsWith('te='))?.split('=')[1];
  const liveSig = parts.find((p: string) => p.startsWith('li='))?.split('=')[1];

  if (!timestamp) return false;

  const expectedSig = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  // Check live signature first, fall back to test
  return expectedSig === liveSig || expectedSig === testSig;
}

export function isPayMongoConfigured(): boolean {
  return !!PAYMONGO_SECRET_KEY;
}
