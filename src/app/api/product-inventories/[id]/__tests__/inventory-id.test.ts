import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getInventoryByIdHandler, updateInventoryHandler, deleteInventoryHandler } from '../route';
import { db } from '@/db/db';
import * as inventoryCalculation from '@/lib/services/inventory-calculation';
import { createDefaultRouteContext } from '@/lib/types';

// Mock dependencies
vi.mock('@/db/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/services/inventory-calculation');
vi.mock('@/middleware/rbac', () => ({
  protectRoute: (handler: unknown) => handler,
}));

describe('Inventory API - GET /api/product-inventory/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return inventory details with movements', async () => {
    const mockInventory = {
      id: 'inv-1',
      productId: 'prod-1',
      productName: 'Product 1',
      productSku: 'SKU001',
      productDescription: 'Test product',
      locationId: 'loc-1',
      locationName: 'Location 1',
      alertThreshold: '10',
      unitOfMeasure: 'pcs',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockMovements = [
      {
        id: 'mov-1',
        inventoryId: 'inv-1',
        type: 'purchase',
        quantity: '100',
        unitPrice: '10.00',
        date: new Date('2024-01-01'),
        remarks: null,
        referenceType: null,
        referenceId: null,
        createdBy: null,
        createdAt: new Date('2024-01-01'),
      },
    ];

    // Mock inventory query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([mockInventory]),
    } as never);

    // Mock movements query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockMovements),
    } as never);

    // Mock stock calculation
    vi.mocked(inventoryCalculation.getCurrentStock).mockResolvedValue({
      inventoryId: 'inv-1',
      currentStock: 100,
      unitOfMeasure: 'pcs',
    });

    const request = new NextRequest('http://localhost/api/product-inventory/inv-1');
    const context = createDefaultRouteContext({ id: 'inv-1' });
    const response = await getInventoryByIdHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      id: 'inv-1',
      currentStock: 100,
      productName: 'Product 1',
    });
    expect(data.movements).toHaveLength(1);
  });

  it('should return 404 if inventory not found', async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never);

    const request = new NextRequest('http://localhost/api/product-inventory/non-existent');
    const context = createDefaultRouteContext({ id: 'non-existent' });
    const response = await getInventoryByIdHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Inventory not found');
  });
});

describe('Inventory API - PATCH /api/product-inventory/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update inventory settings', async () => {
    const updateData = {
      alertThreshold: 20,
      unitOfMeasure: 'kg',
    };

    // Mock inventory exists check
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'inv-1' }]),
    } as never);

    // Mock update
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'inv-1',
          productId: 'prod-1',
          locationId: 'loc-1',
          alertThreshold: '20',
          unitOfMeasure: 'kg',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    } as never);

    const request = new NextRequest('http://localhost/api/product-inventory/inv-1', {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
    const context = createDefaultRouteContext({ id: 'inv-1' });
    const response = await updateInventoryHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.alertThreshold).toBe('20');
    expect(data.unitOfMeasure).toBe('kg');
  });

  it('should return 404 if inventory not found', async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never);

    const request = new NextRequest('http://localhost/api/product-inventory/non-existent', {
      method: 'PATCH',
      body: JSON.stringify({ alertThreshold: 20 }),
    });
    const context = createDefaultRouteContext({ id: 'non-existent' });
    const response = await updateInventoryHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Inventory not found');
  });
});

describe('Inventory API - DELETE /api/product-inventory/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete inventory record', async () => {
    // Mock inventory exists check
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'inv-1' }]),
    } as never);

    // Mock delete
    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    } as never);

    const request = new NextRequest('http://localhost/api/product-inventory/inv-1', {
      method: 'DELETE',
    });
    const context = createDefaultRouteContext({ id: 'inv-1' });
    const response = await deleteInventoryHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Inventory deleted successfully');
  });

  it('should return 404 if inventory not found', async () => {
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never);

    const request = new NextRequest('http://localhost/api/product-inventory/non-existent', {
      method: 'DELETE',
    });
    const context = createDefaultRouteContext({ id: 'non-existent' });
    const response = await deleteInventoryHandler(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Inventory not found');
  });
});
