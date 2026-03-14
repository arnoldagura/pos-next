import { NextRequest, NextResponse } from 'next/server';
import { finalizeCosts } from '@/lib/services/production-workflow';
import { z } from 'zod';

const finalizeSchema = z.object({
  laborCost: z.number().nonnegative('Labor cost must be non-negative').optional(),
  overheadCost: z.number().nonnegative('Overhead cost must be non-negative').optional(),
  finalizedBy: z.string().optional(),
});

// POST /api/production-orders/[id]/finalize
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = finalizeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { laborCost, overheadCost, finalizedBy } = validation.data;

    const costs = await finalizeCosts({
      orderId: id,
      laborCost,
      overheadCost,
      finalizedBy,
    });

    return NextResponse.json({
      success: true,
      message: 'Costs finalized successfully',
      costs,
    });
  } catch (error) {
    console.error('Error finalizing costs:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to finalize costs' }, { status: 500 });
  }
}
