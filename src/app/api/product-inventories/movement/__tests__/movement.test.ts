import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createMovementHandler } from '../route';
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

describe('Inventory API - POST /api/product-inventory/movement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create purchase movement', async () => {
    const movementData = {
      productInventoryId: 'inv-1',
      type: 'purchase' as const,
      quantity: 100,
      unitPrice: 10.5,
      remarks: 'Initial purchase',
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

    // Mock insert
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'mov-1',
          productInventoryId: 'inv-1',
          type: 'purchase',
          quantity: '100',
          unitPrice: '10.50',
          date: new Date(),
          remarks: 'Initial purchase',
          referenceType: null,
          referenceId: null,
          createdBy: null,
          createdAt: new Date(),
        },
      ]),
    } as never);

    vi.mocked(inventoryCalculation.invalidateInventoryCache).mockReturnValue(undefined);
    vi.mocked(inventoryCalculation.invalidateLocationCache).mockReturnValue(undefined);

    const request = new NextRequest('http://localhost/api/product-inventory/movement', {
      method: 'POST',
      body: JSON.stringify(movementData),
    });

    const response = await createMovementHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.type).toBe('purchase');
    expect(data.quantity).toBe('100');
  });

  it('should validate stock availability for sales', async () => {
    const movementData = {
      productInventoryId: 'inv-1',
      type: 'sale' as const,
      quantity: 150,
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

    // Mock stock validation (insufficient)
    vi.mocked(inventoryCalculation.validateStockAvailability).mockResolvedValue({
      inventoryId: 'inv-1',
      available: false,
      currentStock: 100,
      requestedQuantity: 150,
      shortfall: 50,
    });

    const request = new NextRequest('http://localhost/api/product-inventory/movement', {
      method: 'POST',
      body: JSON.stringify(movementData),
    });

    const response = await createMovementHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Insufficient stock');
    expect(data.shortfall).toBe(50);
  });

  it('should return 404 if inventory not found', async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never);

    const request = new NextRequest('http://localhost/api/product-inventory/movement', {
      method: 'POST',
      body: JSON.stringify({
        productInventoryId: 'non-existent',
        type: 'purchase',
        quantity: 100,
      }),
    });

    const response = await createMovementHandler(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Inventory not found');
  });
});
