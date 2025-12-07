import { db } from '@/drizzle/db';
import { product } from '@/drizzle/schema/products';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { protectRoute } from '@/middleware/rbac';
import { and, eq, ilike, or, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function searchProductsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Quick search for POS - search by name, SKU, or barcode
    // Only return active, non-deleted products
    const products = await db
      .select({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        sellingPrice: product.sellingPrice,
        image: product.image,
        unitOfMeasure: product.unitOfMeasure,
        taxRate: product.taxRate,
      })
      .from(product)
      .where(
        and(
          or(
            ilike(product.name, `%${query}%`),
            ilike(product.sku, `%${query}%`),
            ilike(product.barcode, `%${query}%`)
          ),
          eq(product.status, true),
          isNull(product.deletedAt)
        )
      )
      .limit(limit);

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error searching products:', error);

    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}

// GET /api/products/search - Quick search for POS
export const GET = protectRoute(searchProductsHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});
