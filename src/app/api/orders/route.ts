import { db } from '@/db/db';
import {
  order,
  orderItem,
  productInventory,
  orderStatusEnum,
} from '@/drizzle/schema';
import { productInventoryMovement } from '@/drizzle/schema/product-inventory-movements';
import { randomUUID } from 'crypto';
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

interface OrderItemInput {
  productId: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  taxRate?: number;
  subtotal: number;
  total: number;
  notes?: string;
}

function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      locationId,
      tableId,
      customerId,
      customerName,
      paymentMethod,
      amountPaid,
      changeGiven,
      items,
      subtotal,
      totalDiscount,
      totalTax,
      total,
      notes,
    } = body;

    if (!locationId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const orderId = randomUUID();
      const orderNumber = generateOrderNumber();

      const [newOrder] = await tx
        .insert(order)
        .values({
          id: orderId,
          orderNumber,
          locationId,
          tableId: tableId || null,
          customerId: customerId || null,
          customerName: customerName || null,
          status: 'completed',
          paymentMethod: paymentMethod || 'cash',
          paymentStatus: 'paid',
          subtotal: subtotal.toString(),
          totalDiscount: totalDiscount.toString(),
          totalTax: totalTax.toString(),
          total: total.toString(),
          amountPaid: amountPaid?.toString() || total.toString(),
          changeGiven: changeGiven?.toString() || '0',
          notes: notes || null,
          completedAt: new Date(),
        })
        .returning();

      const orderItems = (items as OrderItemInput[]).map((item) => ({
        id: randomUUID(),
        orderId,
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        discount: (item.discount || 0).toString(),
        discountType: item.discountType || 'fixed',
        taxRate: (item.taxRate || 0).toString(),
        subtotal: item.subtotal.toString(),
        total: item.total.toString(),
        notes: item.notes || null,
      }));

      await tx.insert(orderItem).values(orderItems);

      for (const item of items as OrderItemInput[]) {
        const [inventoryRecord] = await tx
          .select()
          .from(productInventory)
          .where(
            and(
              eq(productInventory.productId, item.productId),
              eq(productInventory.locationId, locationId)
            )
          )
          .limit(1);

        if (!inventoryRecord) {
          throw new Error(
            `No inventory found for product ${item.productName} at this location`
          );
        }

        await tx.insert(productInventoryMovement).values({
          id: randomUUID(),
          productInventoryId: inventoryRecord.id,
          type: 'sale',
          quantity: `-${item.quantity}`,
          unitPrice: item.unitPrice.toString(),
          remarks: `Order ${orderNumber}`,
          referenceType: 'order',
          referenceId: orderId,
          createdBy: null,
        });
        const currentQuantity =
          parseFloat(inventoryRecord.currentQuantity) - item.quantity;
        await tx
          .update(productInventory)
          .set({
            currentQuantity: currentQuantity.toString(),
            updatedAt: new Date(),
          })
          .where(eq(productInventory.id, inventoryRecord.id))
          .returning();
      }

      return { order: newOrder, items: orderItems };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to create order',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');
    const tableId = searchParams.get('tableId');
    const status = searchParams.get('status');
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = (page - 1) * limit;

    const conditions = [];

    if (locationId) {
      conditions.push(eq(order.locationId, locationId));
    }

    if (tableId) {
      conditions.push(eq(order.tableId, tableId));
    }

    if (status) {
      conditions.push(eq(order.status, status as OrderStatus));
    }

    if (paymentStatus) {
      conditions.push(eq(order.paymentStatus, paymentStatus as any));
    }

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(order.createdAt, start));
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(order.createdAt, end));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orders = await db
      .select()
      .from(order)
      .where(whereClause)
      .orderBy(desc(order.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
