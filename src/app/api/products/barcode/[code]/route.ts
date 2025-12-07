import { db } from '@/db/db';
import { product } from '@/drizzle/schema/products';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

async function getProductByBarcodeHandler(
  req: NextRequest,
  context: RouteContext<{ code: string }> = createDefaultRouteContext({ code: '' })
) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    // Look up product by barcode - only return active, non-deleted products
    const [foundProduct] = await db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        description: product.description,
        sellingPrice: product.sellingPrice,
        costPrice: product.costPrice,
        image: product.image,
        unitOfMeasure: product.unitOfMeasure,
        taxRate: product.taxRate,
      })
      .from(product)
      .where(
        and(
          eq(product.barcode, code),
          eq(product.status, true),
          isNull(product.deletedAt)
        )
      )
      .limit(1);

    if (!foundProduct) {
      return NextResponse.json(
        { error: 'Product not found with this barcode' },
        { status: 404 }
      );
    }

    return NextResponse.json(foundProduct);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

// GET /api/products/barcode/:code - Barcode lookup
export const GET = protectRoute(getProductByBarcodeHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});
