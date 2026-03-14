import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MovementHistoryPage from '../page';
import * as useMovementsHook from '@/hooks/use-movements';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({ id: 'inv-123' })),
}));

// Mock the hooks
vi.mock('@/hooks/use-movements');

// Mock the child components
vi.mock('@/components/inventory/movement-table', () => ({
  MovementTable: ({ movements }: { movements: unknown[] }) => (
    <div data-testid='movement-table'>Movement Table with {movements.length} movements</div>
  ),
}));

vi.mock('@/components/inventory/movement-filters', () => ({
  MovementFilters: () => <div data-testid='movement-filters'>Filters</div>,
}));

describe('MovementHistoryPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MovementHistoryPage />
      </QueryClientProvider>
    );
  };

  it('should show loading state while fetching movements', () => {
    vi.mocked(useMovementsHook.useMovements).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as never);

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display error message when fetch fails', () => {
    vi.mocked(useMovementsHook.useMovements).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as never);

    renderPage();

    expect(screen.getByText('Error loading movement history')).toBeInTheDocument();
  });

  it('should render movement history page with data', async () => {
    const mockData = {
      data: [
        {
          id: 'mov-1',
          inventoryId: 'inv-123',
          type: 'purchase' as const,
          quantity: '100',
          unitPrice: '10.50',
          date: new Date('2024-01-15'),
          remarks: 'Initial purchase',
          referenceType: 'purchase',
          referenceId: 'po-001',
          createdBy: 'user-1',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'mov-2',
          inventoryId: 'inv-123',
          type: 'sale' as const,
          quantity: '20',
          unitPrice: '15.00',
          date: new Date('2024-01-16'),
          remarks: null,
          referenceType: 'order',
          referenceId: 'ord-001',
          createdBy: 'user-2',
          createdAt: new Date('2024-01-16'),
        },
      ],
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    };

    vi.mocked(useMovementsHook.useMovements).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    // Check main title is rendered (there are two "Movement History" texts - h1 and card title)
    const movementHistoryElements = screen.getAllByText('Movement History');
    expect(movementHistoryElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/2.*total movements/)).toBeInTheDocument();
    expect(screen.getByTestId('movement-filters')).toBeInTheDocument();
    expect(screen.getByTestId('movement-table')).toBeInTheDocument();
  });

  it('should display empty state when no movements exist', async () => {
    const mockData = {
      data: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    };

    vi.mocked(useMovementsHook.useMovements).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('0 total movements')).toBeInTheDocument();
      expect(screen.getByText('Movement Table with 0 movements')).toBeInTheDocument();
    });
  });

  it('should pass correct filters to useMovements hook', () => {
    const mockUseMovements = vi.mocked(useMovementsHook.useMovements);
    mockUseMovements.mockReturnValue({
      data: { data: [], total: 0, page: 1, limit: 100, totalPages: 0 },
      isLoading: false,
      error: null,
    } as never);

    renderPage();

    expect(mockUseMovements).toHaveBeenCalledWith(
      expect.objectContaining({
        inventoryId: 'inv-123',
        page: 1,
        limit: 100,
      })
    );
  });
});
