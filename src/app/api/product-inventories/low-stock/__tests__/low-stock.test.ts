import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getLowStockHandler } from '../route';
import * as inventoryCalculation from '@/lib/services/inventory-calculation';
import { config } from 'dotenv';

config();

// Mock dependencies
vi.mock('@/lib/services/inventory-calculation');
vi.mock('@/middleware/rbac', () => ({
  protectRoute: (handler: unknown) => handler,
}));

describe('Inventory API - GET /api/product-inventory/low-stock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return low stock items for a location', async () => {
    const mockLowStockItems = [
      {
        inventoryId: 'inv-1',
        productId: 'prod-1',
        productName: 'Product 1',
        locationId: 'loc-1',
        locationName: 'Location 1',
        currentStock: 5,
        alertThreshold: 10,
        difference: 5,
        unitOfMeasure: 'pcs',
      },
      {
        inventoryId: 'inv-2',
        productId: 'prod-2',
        productName: 'Product 2',
        locationId: 'loc-1',
        locationName: 'Location 1',
        currentStock: 0,
        alertThreshold: 20,
        difference: 20,
        unitOfMeasure: 'kg',
      },
    ];

    vi.mocked(inventoryCalculation.getLowStockItems).mockResolvedValue(mockLowStockItems);

    const request = new NextRequest(
      'http://localhost/api/product-inventory/low-stock?locationId=loc-1'
    );
    const response = await getLowStockHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(2);
    expect(data.count).toBe(2);
    expect(data.items[0]).toMatchObject({
      inventoryId: 'inv-1',
      currentStock: 5,
      alertThreshold: 10,
    });
  });

  it('should return empty array when no low stock items', async () => {
    vi.mocked(inventoryCalculation.getLowStockItems).mockResolvedValue([]);

    const request = new NextRequest(
      'http://localhost/api/product-inventory/low-stock?locationId=loc-1'
    );
    const response = await getLowStockHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(0);
    expect(data.count).toBe(0);
  });

  it('should require locationId parameter', async () => {
    const request = new NextRequest('http://localhost/api/product-inventory/low-stock');
    const response = await getLowStockHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Location ID is required');
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(inventoryCalculation.getLowStockItems).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost/api/product-inventory/low-stock?locationId=loc-1'
    );
    const response = await getLowStockHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch low stock items');
  });
});
