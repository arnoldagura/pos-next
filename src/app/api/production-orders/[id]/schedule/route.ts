import { NextRequest, NextResponse } from 'next/server';
import { schedule } from '@/lib/services/production-workflow';
import { z } from 'zod';

const scheduleSchema = z.object({
  scheduledDate: z.string().optional(),
});

// POST /api/production-orders/[id]/schedule
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = scheduleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { scheduledDate } = validation.data;

    await schedule(id, scheduledDate ? new Date(scheduledDate) : undefined);

    return NextResponse.json({ success: true, message: 'Order scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling production order:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Failed to schedule production order' },
      { status: 500 }
    );
  }
}
