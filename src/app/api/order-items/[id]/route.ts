import { db } from '@/db/db';
import { orderItem, itemStatusEnum } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/tenant-context';

type ItemStatus = (typeof itemStatusEnum.enumValues)[number];

const VALID_ITEM_TRANSITIONS: Record<ItemStatus, ItemStatus[]> = {
  pending: ['ready', 'served'],
  ready: ['pending', 'served'],
  served: ['ready'],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireTenantId();
    const { id } = await params;
    const body = await req.json();
    const { itemStatus: newStatus } = body;

    if (!newStatus || !itemStatusEnum.enumValues.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid item status' },
        { status: 400 }
      );
    }

    // Fetch current item
    const [existing] = await db
      .select({ itemStatus: orderItem.itemStatus })
      .from(orderItem)
      .where(eq(orderItem.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Validate transition
    const allowed = VALID_ITEM_TRANSITIONS[existing.itemStatus];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from "${existing.itemStatus}" to "${newStatus}"` },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(orderItem)
      .set({
        itemStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(orderItem.id, id))
      .returning();

    return NextResponse.json({ item: updated });
  } catch (error) {
    console.error('Error updating item status:', error);
    return NextResponse.json(
      { error: 'Failed to update item status' },
      { status: 500 }
    );
  }
}
