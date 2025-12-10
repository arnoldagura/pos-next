import { NextRequest, NextResponse } from 'next/server';
import { cancel } from '@/lib/services/production-workflow';
import { z } from 'zod';

const cancelSchema = z.object({
  cancelledBy: z.string().optional(),
});

// POST /api/production-orders/[id]/cancel
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = cancelSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { cancelledBy } = validation.data;

    await cancel(id, cancelledBy);

    return NextResponse.json({
      success: true,
      message: 'Production order cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling production order:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to cancel production order' },
      { status: 500 }
    );
  }
}
