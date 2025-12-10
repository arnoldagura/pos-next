import { NextRequest, NextResponse } from 'next/server';
import { estimateProductionCost } from '@/lib/services/production-costing';
import { z } from 'zod';

const estimateCostSchema = z.object({
  quantity: z.number().positive('Quantity must be positive'),
  laborCost: z.number().nonnegative().optional(),
  overheadCost: z.number().nonnegative().optional(),
});

// POST /api/recipes/[id]/estimate-cost - Get cost estimate for a recipe
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const validatedData = estimateCostSchema.parse(body);

    const estimate = await estimateProductionCost(
      params.id,
      validatedData.quantity,
      validatedData.laborCost,
      validatedData.overheadCost
    );

    return NextResponse.json(estimate);
  } catch (error) {
    console.error('Error estimating cost:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to estimate cost' },
      { status: 500 }
    );
  }
}
