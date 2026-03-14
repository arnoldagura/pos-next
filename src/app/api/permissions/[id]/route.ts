import { db } from '@/db/db';
import { permission } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [found] = await db.select().from(permission).where(eq(permission.id, id)).limit(1);

    if (!found) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 });
    }

    return NextResponse.json(found);
  } catch (error) {
    console.error('Error fetching permission:', error);
    return NextResponse.json({ error: 'Failed to fetch permission' }, { status: 500 });
  }
}
