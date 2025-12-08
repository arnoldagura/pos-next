import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getMovementsHandler } from '../route';
import { db } from '@/db/db';

// Mock dependencies
vi.mock('@/db/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/middleware/rbac', () => ({
  protectRoute: (handler: unknown) => handler,
}));

describe('Inventory API - GET /api/inventory/movements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return movements list', async () => {
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
      {
        id: 'mov-2',
        inventoryId: 'inv-1',
        type: 'sale',
        quantity: '20',
        unitPrice: '15.00',
        date: new Date('2024-01-02'),
        remarks: null,
        referenceType: 'order',
        referenceId: 'order-123',
        createdBy: 'user-1',
        createdAt: new Date('2024-01-02'),
      },
    ];

    // Mock count query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ totalCount: 2 }]),
    } as never);

    // Mock movements query
    const mockDbChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnValue(mockMovements),
    };

    vi.mocked(db.select).mockReturnValue(mockDbChain as never);

    const request = new NextRequest('http://localhost/api/inventory/movements?page=1&limit=50');
    const response = await getMovementsHandler(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.movements).toHaveLength(2);
    expect(data.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 2,
      totalPages: 1,
    });
  });

  it('should filter by inventoryId', async () => {
    // Mock count query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ totalCount: 0 }]),
    } as never);

    // Mock movements query
    const mockDbChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnValue([]),
    };

    vi.mocked(db.select).mockReturnValue(mockDbChain as never);

    const request = new NextRequest('http://localhost/api/inventory/movements?inventoryId=inv-1');
    const response = await getMovementsHandler(request);

    expect(response.status).toBe(200);
    expect(mockDbChain.where).toHaveBeenCalled();
  });

  it('should filter by type', async () => {
    // Mock count query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ totalCount: 0 }]),
    } as never);

    // Mock movements query
    const mockDbChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnValue([]),
    };

    vi.mocked(db.select).mockReturnValue(mockDbChain as never);

    const request = new NextRequest('http://localhost/api/inventory/movements?type=purchase');
    const response = await getMovementsHandler(request);

    expect(response.status).toBe(200);
    expect(mockDbChain.where).toHaveBeenCalled();
  });

  it('should filter by date range', async () => {
    // Mock count query
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ totalCount: 0 }]),
    } as never);

    // Mock movements query
    const mockDbChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnValue([]),
    };

    vi.mocked(db.select).mockReturnValue(mockDbChain as never);

    const request = new NextRequest(
      'http://localhost/api/inventory/movements?startDate=2024-01-01&endDate=2024-12-31'
    );
    const response = await getMovementsHandler(request);

    expect(response.status).toBe(200);
    expect(mockDbChain.where).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(db.select).mockImplementation(() => {
      throw new Error('Database error');
    });

    const request = new NextRequest('http://localhost/api/inventory/movements');
    const response = await getMovementsHandler(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch movements');
  });
});
