import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getInventoryHandler,
  createInventoryHandler,
} from '../route';
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

describe('Inventory API - GET /api/inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return inventory list with stock levels', async () => {
    const mockInventoryData = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Product 1',
        productSku: 'SKU001',
        locationId: 'loc-1',
        locationName: 'Location 1',
        alertThreshold: '10',
        unitOfMeasure: 'pcs',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    const mockDbChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnValue(mockInventoryData),
    };

    vi.mocked(db.select).mockReturnValue(mockDbChain as never);

    // Mock count query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ totalCount: 1 }]),
    } as never);

    // Mock stock levels
    vi.mocked(inventoryCalculation.getBulkStockLevels).mockResolvedValue({
      'inv-1': { inventoryId: 'inv-1', currentStock: 50, unitOfMeasure: 'pcs' },
    });

    const request = new NextRequest('http://localhost/api/inventory?page=1&limit=50');
    const response = await getInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.inventory).toHaveLength(1);
    expect(data.inventory[0]).toMatchObject({
      id: 'inv-1',
      currentStock: 50,
      belowThreshold: false,
    });
    expect(data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
  });

  it('should filter by locationId', async () => {
    const mockDbChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnValue([]),
    };

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ totalCount: 0 }]),
    } as never);

    vi.mocked(db.select).mockReturnValue(mockDbChain as never);
    vi.mocked(inventoryCalculation.getBulkStockLevels).mockResolvedValue({});

    const request = new NextRequest('http://localhost/api/inventory?locationId=loc-1');
    const response = await getInventoryHandler(request);

    expect(response.status).toBe(200);
    expect(mockDbChain.where).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = new NextRequest('http://localhost/api/inventory');
    const response = await getInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch inventory');
  });
});

describe('Inventory API - POST /api/inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create new inventory record', async () => {
    const newInventory = {
      productId: 'prod-1',
      locationId: 'loc-1',
      alertThreshold: 10,
      unitOfMeasure: 'pcs',
    };

    // Mock existing inventory check (none exists)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never);

    // Mock product exists check
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'prod-1' }]),
    } as never);

    // Mock location exists check
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'loc-1' }]),
    } as never);

    // Mock insert
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{
        id: 'inv-new',
        ...newInventory,
        alertThreshold: '10',
      }]),
    } as never);

    const request = new NextRequest('http://localhost/api/inventory', {
      method: 'POST',
      body: JSON.stringify(newInventory),
    });

    const response = await createInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toMatchObject({
      id: 'inv-new',
      productId: 'prod-1',
      locationId: 'loc-1',
    });
  });

  it('should reject duplicate product-location combination', async () => {
    const newInventory = {
      productId: 'prod-1',
      locationId: 'loc-1',
      alertThreshold: 10,
    };

    // Mock existing inventory (already exists)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'existing-inv' }]),
    } as never);

    const request = new NextRequest('http://localhost/api/inventory', {
      method: 'POST',
      body: JSON.stringify(newInventory),
    });

    const response = await createInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Inventory already exists for this product at this location');
  });

  it('should reject if product does not exist', async () => {
    const newInventory = {
      productId: 'non-existent',
      locationId: 'loc-1',
      alertThreshold: 10,
    };

    // Mock existing inventory check (none exists)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never);

    // Mock product exists check (not found)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never);

    const request = new NextRequest('http://localhost/api/inventory', {
      method: 'POST',
      body: JSON.stringify(newInventory),
    });

    const response = await createInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Product not found');
  });

  it('should validate input data', async () => {
    const invalidData = {
      productId: '',
      locationId: '',
      alertThreshold: -1,
    };

    const request = new NextRequest('http://localhost/api/inventory', {
      method: 'POST',
      body: JSON.stringify(invalidData),
    });

    const response = await createInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });
});
