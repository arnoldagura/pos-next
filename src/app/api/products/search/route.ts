import { db } from '@/drizzle/db';
import { product } from '@/drizzle/schema/products';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { protectRoute } from '@/middleware/rbac';
import { and, eq, ilike, isNull } from 'drizzle-orm';
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

    const products = await db
      .select({
        id: product.id,
        name: product.name,
        description: product.description,
        image: product.image,
        categoryId: product.categoryId,
        status: product.status,
      })
      .from(product)
      .where(
        and(
          ilike(product.name, `%${query}%`),
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
