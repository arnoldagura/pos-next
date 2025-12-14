import { ACTIONS, RESOURCES } from '@/lib/rbac';
import { protectRoute } from '@/middleware/rbac';
import { NextRequest, NextResponse } from 'next/server';
import { getLowStockItems } from '@/lib/services/inventory-calculation';

export async function getLowStockHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId');

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    const lowStockItems = await getLowStockItems(locationId);

    return NextResponse.json({
      items: lowStockItems,
      count: lowStockItems.length,
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);

    return NextResponse.json(
      { error: 'Failed to fetch low stock items' },
      { status: 500 }
    );
  }
}

// GET /api/product-inventories/low-stock - Get items below threshold
export const GET = protectRoute(getLowStockHandler, {
  resource: RESOURCES.INVENTORY,
  action: ACTIONS.READ,
});
