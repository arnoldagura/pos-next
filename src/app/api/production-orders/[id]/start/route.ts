import { NextRequest, NextResponse } from 'next/server';
import { startProduction } from '@/lib/services/production-workflow';
import { z } from 'zod';

const startSchema = z.object({
  startedBy: z.string().optional(),
});

// POST /api/production-orders/[id]/start
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = startSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { startedBy } = validation.data;

    await startProduction({ orderId: id, startedBy });

    return NextResponse.json({
      success: true,
      message: 'Production started successfully',
    });
  } catch (error) {
    console.error('Error starting production:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to start production' }, { status: 500 });
  }
}
