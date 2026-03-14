import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getInventoryHandler, createInventoryHandler } from '../route';
import { db } from '@/db/db';

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
vi.mock('@/lib/tenant-context', () => ({
  requireTenantId: vi.fn().mockResolvedValue('tenant-1'),
}));
vi.mock('@/lib/validations', () => ({
  generateSku: vi.fn().mockReturnValue('SKU-001'),
  generateSlug: vi.fn().mockReturnValue('product-1'),
}));

describe('Inventory API - GET /api/product-inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return inventory list with stock levels', async () => {
    const mockInventoryData = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Product 1',
        locationId: 'loc-1',
        locationName: 'Location 1',
        currentQuantity: '50',
        alertThreshold: '10',
        unitOfMeasure: 'pcs',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    // Mock count query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ totalCount: 1 }]),
    } as never);

    // Mock inventory records query
    const mockDbChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnValue(mockInventoryData),
    };
    vi.mocked(db.select).mockReturnValueOnce(mockDbChain as never);

    const request = new NextRequest('http://localhost/api/product-inventory?page=1&limit=50');
    const response = await getInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.inventory).toHaveLength(1);
    expect(data.inventory[0]).toMatchObject({
      id: 'inv-1',
    });
    expect(data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
  });

  it('should filter by locationId', async () => {
    // Mock count query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ totalCount: 0 }]),
    } as never);

    // Mock inventory records query
    const mockDbChain = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnValue([]),
    };
    vi.mocked(db.select).mockReturnValueOnce(mockDbChain as never);

    const request = new NextRequest('http://localhost/api/product-inventory?locationId=loc-1');
    const response = await getInventoryHandler(request);

    expect(response.status).toBe(200);
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = new NextRequest('http://localhost/api/product-inventory');
    const response = await getInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch inventory');
  });
});

describe('Inventory API - POST /api/product-inventory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create new inventory record', async () => {
    const newInventory = {
      productId: 'prod-1',
      locationId: 'loc-1',
      unitPrice: 10,
      unitOfMeasure: 'pcs',
      alertThreshold: 10,
      taxRate: 0,
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
      limit: vi.fn().mockResolvedValue([{ id: 'prod-1', name: 'Product 1' }]),
    } as never);

    // Mock SKU uniqueness check
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    } as never);

    // Mock location exists check
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'loc-1' }]),
    } as never);

    // Mock insert for productInventory
    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: 'inv-new',
          productId: 'prod-1',
          locationId: 'loc-1',
          alertThreshold: '10',
          unitOfMeasure: 'pcs',
        },
      ]),
    } as never);

    // Mock insert for productInventoryMovement (initial movement)
    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 'mov-1' }]),
    } as never);

    const request = new NextRequest('http://localhost/api/product-inventory', {
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
      unitPrice: 10,
      unitOfMeasure: 'pcs',
      alertThreshold: 10,
      taxRate: 0,
    };

    // Mock existing inventory (already exists)
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([{ id: 'existing-inv' }]),
    } as never);

    const request = new NextRequest('http://localhost/api/product-inventory', {
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
      unitPrice: 10,
      unitOfMeasure: 'pcs',
      alertThreshold: 10,
      taxRate: 0,
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

    const request = new NextRequest('http://localhost/api/product-inventory', {
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

    const request = new NextRequest('http://localhost/api/product-inventory', {
      method: 'POST',
      body: JSON.stringify(invalidData),
    });

    const response = await createInventoryHandler(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation error');
  });
});
