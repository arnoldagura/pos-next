import { NextRequest, NextResponse } from 'next/server';
import { checkMaterialAvailability } from '@/lib/services/production-workflow';

// GET /api/production-orders/[id]/check-availability
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const availability = await checkMaterialAvailability(id);

    const allSufficient = availability.every((item) => item.sufficient);

    return NextResponse.json({
      availability,
      allSufficient,
      insufficientCount: availability.filter((item) => !item.sufficient).length,
    });
  } catch (error) {
    console.error('Error checking material availability:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to check material availability' }, { status: 500 });
  }
}
