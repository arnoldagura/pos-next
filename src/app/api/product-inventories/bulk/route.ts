import { db } from '@/db/db';
import { productInventory } from '@/drizzle/schema';
import { productInventoryMovement } from '@/drizzle/schema/product-inventory-movements';
import { randomUUID } from 'crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

type BulkOperationType =
  | 'adjust_price'
  | 'adjust_stock'
  | 'change_status'
  | 'update_threshold';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      inventoryIds,
      operation,
      value,
      adjustmentType = 'percentage',
      remarks = '',
    } = body;

    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
      return NextResponse.json(
        { error: 'No inventory IDs provided' },
        { status: 400 }
      );
    }

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation type is required' },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      switch (operation as BulkOperationType) {
        case 'adjust_price': {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            throw new Error('Invalid price value');
          }

          // Fetch current prices
          const items = await tx
            .select({ id: productInventory.id, unitPrice: productInventory.unitPrice })
            .from(productInventory)
            .where(inArray(productInventory.id, inventoryIds));

          // Update each item's price
          for (const item of items) {
            const currentPrice = parseFloat(item.unitPrice || '0');
            let newPrice: number;

            if (adjustmentType === 'percentage') {
              newPrice = currentPrice * (1 + numValue / 100);
            } else {
              newPrice = currentPrice + numValue;
            }

            // Ensure price doesn't go negative
            newPrice = Math.max(0, newPrice);

            await tx
              .update(productInventory)
              .set({
                unitPrice: newPrice.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(productInventory.id, item.id));
          }
          break;
        }

        case 'adjust_stock': {
          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            throw new Error('Invalid stock value');
          }

          // Fetch current quantities
          const items = await tx
            .select({
              id: productInventory.id,
              currentQuantity: productInventory.currentQuantity,
              unitPrice: productInventory.unitPrice,
            })
            .from(productInventory)
            .where(inArray(productInventory.id, inventoryIds));

          for (const item of items) {
            const currentQty = parseFloat(item.currentQuantity || '0');
            const newQty = Math.max(0, currentQty + numValue);

            await tx
              .update(productInventory)
              .set({
                currentQuantity: newQty.toString(),
                updatedAt: new Date(),
              })
              .where(eq(productInventory.id, item.id));

            // Record movement
            await tx.insert(productInventoryMovement).values({
              id: randomUUID(),
              productInventoryId: item.id,
              type: 'adjustment',
              quantity: numValue.toString(),
              unitPrice: item.unitPrice,
              remarks: remarks || 'Bulk stock adjustment',
              createdBy: null,
            });
          }
          break;
        }

        case 'update_threshold': {
          const numValue = parseFloat(value);
          if (isNaN(numValue) || numValue < 0) {
            throw new Error('Invalid threshold value');
          }

          await tx
            .update(productInventory)
            .set({
              alertThreshold: numValue.toString(),
              updatedAt: new Date(),
            })
            .where(inArray(productInventory.id, inventoryIds));
          break;
        }

        case 'change_status': {
          if (!['active', 'inactive'].includes(value)) {
            throw new Error('Invalid status value');
          }

          // Update corresponding products status
          await tx.execute(sql`
            UPDATE product
            SET status = ${value === 'active'}
            WHERE id IN (
              SELECT product_id
              FROM product_inventory
              WHERE id = ANY(${inventoryIds})
            )
          `);
          break;
        }

        default:
          throw new Error('Invalid operation type');
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${inventoryIds.length} items`,
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to perform bulk operation',
      },
      { status: 500 }
    );
  }
}
