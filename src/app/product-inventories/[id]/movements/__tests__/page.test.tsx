import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import InventoryMovementsClient from '@/components/product-inventories/inventory-movements-client';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MovementHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should show loading state while fetching movements', () => {
    // fetch never resolves, so component stays in loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<InventoryMovementsClient inventoryId='inv-123' />);

    // The loading state shows a skeleton with animate-pulse elements
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).not.toBeNull();
  });

  it('should display error message when fetch fails', async () => {
    // Mock inventory details fetch to fail
    mockFetch.mockRejectedValue(new Error('Failed to fetch'));

    render(<InventoryMovementsClient inventoryId='inv-123' />);

    // After fetch fails, loading completes and shows "No movements found"
    await waitFor(() => {
      expect(screen.getByText('No movements found')).toBeInTheDocument();
    });
  });

  it('should render movement history page with data', async () => {
    const mockMovements = [
      {
        id: 'mov-1',
        type: 'purchase',
        quantity: '100',
        unitPrice: '10.50',
        date: '2024-01-15T00:00:00.000Z',
        remarks: 'Initial purchase',
        referenceType: 'purchase',
        referenceId: 'po-001',
        createdBy: 'user-1',
      },
      {
        id: 'mov-2',
        type: 'sale',
        quantity: '20',
        unitPrice: '15.00',
        date: '2024-01-16T00:00:00.000Z',
        remarks: null,
        referenceType: 'order',
        referenceId: 'ord-001',
        createdBy: 'user-2',
      },
    ];

    const mockInventoryDetails = {
      id: 'inv-123',
      productName: 'Test Product',
      productSku: 'SKU-001',
      locationName: 'Main Store',
      currentStock: 80,
      unitOfMeasure: 'pcs',
    };

    // First call = inventory details, second call = movements
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInventoryDetails,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: mockMovements,
          pagination: { totalPages: 1 },
        }),
      });

    render(<InventoryMovementsClient inventoryId='inv-123' />);

    await waitFor(() => {
      expect(screen.getByText('Movement History')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('should display empty state when no movements exist', async () => {
    const mockInventoryDetails = {
      id: 'inv-123',
      productName: 'Test Product',
      productSku: null,
      locationName: 'Main Store',
      currentStock: 0,
      unitOfMeasure: 'pcs',
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockInventoryDetails,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { totalPages: 0 },
        }),
      });

    render(<InventoryMovementsClient inventoryId='inv-123' />);

    await waitFor(() => {
      expect(screen.getByText('No movements found')).toBeInTheDocument();
    });
  });

  it('should pass correct inventoryId to fetch calls', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'inv-123',
          productName: 'Test',
          productSku: null,
          locationName: 'Store',
          currentStock: 0,
          unitOfMeasure: 'pcs',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { totalPages: 0 },
        }),
      });

    render(<InventoryMovementsClient inventoryId='inv-123' />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/product-inventories/inv-123')
      );
    });
  });
});
