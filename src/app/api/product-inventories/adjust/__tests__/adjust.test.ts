import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { adjustStockHandler } from '../route';
import { db } from '@/db/db';
import * as inventoryCalculation from '@/lib/services/inventory-calculation';

// Mock dependencies
vi.mock('@/db/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock('@/lib/services/inventory-calculation');
vi.mock('@/middleware/rbac', () => ({
  protectRoute: (handler: unknown) => handler,
}));

describe('Inventory API - POST /api/product-inventory/adjust', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create positive adjustment', async () => {
    const adjustmentData = {
      productInventoryId: 'inv-1',
      quantity: 10,
      remarks: 'Found missing items',
    };

    // Mock inventory exists
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: 'inv-1',
          locationId: 'loc-1',
        },
      ]),
    } as never);

    // Mock current stock
    vi.mocked(inventoryCalculation.getCurrentStock)
      .mockResolvedValueOnce({
        inventoryId: 'inv-1',
        currentStock: 100,
        unitOfMeasure: 'pcs',
      })
      .mockResolvedValueOnce({
        inventoryId: 'inv-1',
        currentStock: 110,
        unitOfMeasure: 'pcs',
      });

    // Mock insert
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'adj-1',
          productInventoryId: 'inv-1',
          type: 'adjustment',
          quantity: '10',
          date: new Date(),
          remarks: 'Found missing items',
          createdAt: new Date(),
        },
      ]),
    } as never);

    vi.mocked(inventoryCalculation.invalidateInventoryCache).mockReturnValue(undefined);
    vi.mocked(inventoryCalculation.invalidateLocationCache).mockReturnValue(undefined);

    const request = new NextRequest('http://localhost/api/product-inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(adjustmentData),
    });

    const response = await adjustStockHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.previousStock).toBe(100);
    expect(data.newStock).toBe(110);
    expect(data.change).toBe(10);
  });

  it('should create negative adjustment with validation', async () => {
    const adjustmentData = {
      productInventoryId: 'inv-1',
      quantity: -5,
      remarks: 'Damaged items removed',
    };

    // Mock inventory exists
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: 'inv-1',
          locationId: 'loc-1',
        },
      ]),
    } as never);

    // Mock current stock
    vi.mocked(inventoryCalculation.getCurrentStock)
      .mockResolvedValueOnce({
        inventoryId: 'inv-1',
        currentStock: 100,
        unitOfMeasure: 'pcs',
      })
      .mockResolvedValueOnce({
        inventoryId: 'inv-1',
        currentStock: 95,
        unitOfMeasure: 'pcs',
      });

    // Mock insert
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'adj-1',
          productInventoryId: 'inv-1',
          type: 'adjustment',
          quantity: '5',
          date: new Date(),
          remarks: 'Damaged items removed',
          createdAt: new Date(),
        },
      ]),
    } as never);

    vi.mocked(inventoryCalculation.invalidateInventoryCache).mockReturnValue(undefined);
    vi.mocked(inventoryCalculation.invalidateLocationCache).mockReturnValue(undefined);

    const request = new NextRequest('http://localhost/api/product-inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(adjustmentData),
    });

    const response = await adjustStockHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.change).toBe(-5);
  });

  it('should reject negative adjustment with insufficient stock', async () => {
    const adjustmentData = {
      productInventoryId: 'inv-1',
      quantity: -150,
      remarks: 'Too many items',
    };

    // Mock inventory exists
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          id: 'inv-1',
          locationId: 'loc-1',
        },
      ]),
    } as never);

    // Mock current stock (insufficient)
    vi.mocked(inventoryCalculation.getCurrentStock).mockResolvedValue({
      inventoryId: 'inv-1',
      currentStock: 100,
      unitOfMeasure: 'pcs',
    });

    const request = new NextRequest('http://localhost/api/product-inventory/adjust', {
      method: 'POST',
      body: JSON.stringify(adjustmentData),
    });

    const response = await adjustStockHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Insufficient stock for adjustment');
  });

  it('should validate remarks are required', async () => {
    const request = new NextRequest('http://localhost/api/product-inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({
        productInventoryId: 'inv-1',
        quantity: 10,
        // Missing remarks
      }),
    });

    const response = await adjustStockHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });
});
