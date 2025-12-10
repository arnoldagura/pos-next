import { NextRequest, NextResponse } from 'next/server';
import { completeProduction } from '@/lib/services/production-workflow';
import { z } from 'zod';

const completeSchema = z.object({
  actualQuantity: z.number().positive('Actual quantity must be positive'),
  completedBy: z.string().optional(),
});

// POST /api/production-orders/[id]/complete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id} = await params;
    const body = await request.json();

    const validation = completeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { actualQuantity, completedBy } = validation.data;

    await completeProduction({
      orderId: id,
      actualQuantity,
      completedBy,
    });

    return NextResponse.json({
      success: true,
      message: 'Production completed successfully',
    });
  } catch (error) {
    console.error('Error completing production:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to complete production' },
      { status: 500 }
    );
  }
}
