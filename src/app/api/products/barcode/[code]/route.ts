import { db } from '@/db/db';
import { product, productInventory, location } from '@/drizzle/schema';
import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { requireTenantId } from '@/lib/tenant-context';
import { RouteContext, createDefaultRouteContext } from '@/lib/types';
import { protectRoute } from '@/middleware/rbac';
import { eq, and, isNull } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

async function getProductByBarcodeHandler(
  req: NextRequest,
  context: RouteContext<{ code: string }> = createDefaultRouteContext({
    code: '',
  })
) {
  try {
    const tenantId = await requireTenantId();
    const { code } = await context.params;
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');

    if (!code) {
      return NextResponse.json(
        { error: 'Barcode is required' },
        { status: 400 }
      );
    }

    const [foundInventory] = await db
      .select({
        inventoryId: productInventory.id,
        productId: productInventory.productId,
        productName: product.name,
        locationId: productInventory.locationId,
        locationName: location.name,
        variantName: productInventory.variantName,
        sku: productInventory.sku,
        barcode: productInventory.barcode,
        description: product.description,
        unitPrice: productInventory.unitPrice,
        cost: productInventory.cost,
        currentQuantity: productInventory.currentQuantity,
        image: product.image,
        unitOfMeasure: productInventory.unitOfMeasure,
        taxRate: productInventory.taxRate,
      })
      .from(productInventory)
      .innerJoin(product, eq(productInventory.productId, product.id))
      .innerJoin(location, eq(productInventory.locationId, location.id))
      .where(
        and(
          eq(product.organizationId, tenantId),
          eq(productInventory.barcode, code),
          eq(product.status, true),
          isNull(product.deletedAt),
          locationId ? eq(productInventory.locationId, locationId) : undefined
        )
      )
      .limit(1);

    if (!foundInventory) {
      return NextResponse.json(
        { error: 'Product not found with this barcode' },
        { status: 404 }
      );
    }

    // Get current stock level
    // const stockLevels = await getBulkStockLevels([foundInventory.inventoryId]);
    const currentStock = parseFloat(foundInventory.currentQuantity) || 0;

    return NextResponse.json({
      ...foundInventory,
      currentStock,
    });
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
