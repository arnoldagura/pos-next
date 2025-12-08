import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { recordWasteHandler } from '../route';
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

describe('Inventory API - POST /api/inventory/waste', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record waste', async () => {
    const wasteData = {
      inventoryId: 'inv-1',
      quantity: 5,
      remarks: 'Expired products',
    };

    // Mock inventory exists
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 'inv-1',
        locationId: 'loc-1',
      }]),
    } as never);

    // Mock stock validation (sufficient)
    vi.mocked(inventoryCalculation.validateStockAvailability).mockResolvedValue({
      inventoryId: 'inv-1',
      available: true,
      currentStock: 100,
      requestedQuantity: 5,
    });

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
      returning: vi.fn().mockResolvedValue([{
        id: 'waste-1',
        inventoryId: 'inv-1',
        type: 'waste',
        quantity: '5',
        date: new Date(),
        remarks: 'Expired products',
        createdAt: new Date(),
      }]),
    } as never);

    vi.mocked(inventoryCalculation.invalidateInventoryCache).mockReturnValue(undefined);
    vi.mocked(inventoryCalculation.invalidateLocationCache).mockReturnValue(undefined);

    const request = new NextRequest('http://localhost/api/inventory/waste', {
      method: 'POST',
      body: JSON.stringify(wasteData),
    });

    const response = await recordWasteHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.previousStock).toBe(100);
    expect(data.newStock).toBe(95);
    expect(data.wasteQuantity).toBe(5);
  });

  it('should reject waste with insufficient stock', async () => {
    const wasteData = {
      inventoryId: 'inv-1',
      quantity: 150,
      remarks: 'Too much waste',
    };

    // Mock inventory exists
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{
        id: 'inv-1',
        locationId: 'loc-1',
      }]),
    } as never);

    // Mock stock validation (insufficient)
    vi.mocked(inventoryCalculation.validateStockAvailability).mockResolvedValue({
      inventoryId: 'inv-1',
      available: false,
      currentStock: 100,
      requestedQuantity: 150,
      shortfall: 50,
    });

    const request = new NextRequest('http://localhost/api/inventory/waste', {
      method: 'POST',
      body: JSON.stringify(wasteData),
    });

    const response = await recordWasteHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Insufficient stock to record waste');
  });

  it('should validate remarks are required', async () => {
    const request = new NextRequest('http://localhost/api/inventory/waste', {
      method: 'POST',
      body: JSON.stringify({
        inventoryId: 'inv-1',
        quantity: 5,
        // Missing remarks
      }),
    });

    const response = await recordWasteHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });
});
