import { db } from '@/db/db';
import { productInventory } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getBulkStockLevels } from '@/lib/services/inventory-calculation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, locationId } = body;

    if (!items || !Array.isArray(items) || !locationId) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    const insufficientStock: Array<{
      productId: string;
      requested: number;
      available: number;
    }> = [];

    for (const item of items) {
      const { productId, quantity } = item;

      const [inventoryRecord] = await db
        .select()
        .from(productInventory)
        .where(
          and(
            eq(productInventory.productId, productId),
            eq(productInventory.locationId, locationId)
          )
        )
        .limit(1);

      if (!inventoryRecord) {
        insufficientStock.push({
          productId,
          requested: quantity,
          available: 0,
        });
        continue;
      }

      const stockLevels = await getBulkStockLevels([inventoryRecord.id]);
      const currentStock = stockLevels[inventoryRecord.id]?.currentStock || 0;

      if (currentStock < quantity) {
        insufficientStock.push({
          productId,
          requested: quantity,
          available: currentStock,
        });
      }
    }

    if (insufficientStock.length > 0) {
      return NextResponse.json(
        {
          error: 'Insufficient stock for some items',
          insufficientStock,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Error validating stock:', error);
    return NextResponse.json(
      { error: 'Failed to validate stock' },
      { status: 500 }
    );
  }
}
