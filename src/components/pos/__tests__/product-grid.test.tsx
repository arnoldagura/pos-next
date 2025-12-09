import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGrid } from '../product-grid';
import { useCartStore } from '@/stores';

// Mock fetch
global.fetch = vi.fn();

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} {...props} />,
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockProducts = [
  {
    id: 'prod-1',
    name: 'Cappuccino',
    slug: 'cappuccino',
    sku: 'CAP-001',
    barcode: '1234567890',
    description: 'Delicious cappuccino',
    sellingPrice: '4.50',
    costPrice: '2.00',
    categoryId: 'cat-1',
    image: '/images/cappuccino.jpg',
    status: true,
    unitOfMeasure: 'cup',
    taxRate: '10',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'prod-2',
    name: 'Latte',
    slug: 'latte',
    sku: 'LAT-001',
    barcode: '0987654321',
    description: 'Smooth latte',
    sellingPrice: '5.00',
    costPrice: '2.50',
    categoryId: 'cat-1',
    image: null,
    status: true,
    unitOfMeasure: 'cup',
    taxRate: '10',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
];

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Coffee',
    slug: 'coffee',
    isActive: true,
  },
  {
    id: 'cat-2',
    name: 'Tea',
    slug: 'tea',
    isActive: true,
  },
];

const mockInventory = [
  {
    id: 'inv-1',
    productId: 'prod-1',
    locationId: 'loc-1',
    currentStock: 50,
    belowThreshold: false,
  },
  {
    id: 'inv-2',
    productId: 'prod-2',
    locationId: 'loc-1',
    currentStock: 3,
    belowThreshold: true,
  },
];

describe('ProductGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset cart store
    useCartStore.setState({
      activeCartId: null,
      carts: new Map(),
    });

    // Setup fetch mock
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url.includes('/api/categories')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ categories: mockCategories }),
          });
        }
        if (url.includes('/api/products')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                products: mockProducts,
                pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
              }),
          });
        }
        if (url.includes('/api/inventory')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                inventory: mockInventory,
                pagination: { page: 1, limit: 1000, total: 2, totalPages: 1 },
              }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }
    );
  });

  it('renders product grid with products', async () => {
    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
      expect(screen.getByText('Latte')).toBeInTheDocument();
    });
  });

  it('displays product prices correctly', async () => {
    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('$4.50')).toBeInTheDocument();
      expect(screen.getByText('$5.00')).toBeInTheDocument();
    });
  });

  it('shows stock indicators when location is provided', async () => {
    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText(/50.*available/)).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });
  });

  it('filters products by search term', async () => {
    const user = userEvent.setup();
    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'Latte');

    // Wait for debounce or filter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=Latte')
      );
    });
  });

  it('filters products by category', async () => {
    const user = userEvent.setup();
    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument();
    });

    const coffeeTab = screen.getByRole('tab', { name: 'Coffee' });
    await user.click(coffeeTab);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('categoryId=cat-1')
      );
    });
  });

  it('adds product to cart when clicked', async () => {
    const user = userEvent.setup();
    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const productCard = screen.getByText('Cappuccino').closest('button');
    expect(productCard).toBeInTheDocument();

    await user.click(productCard!);

    const cart = useCartStore.getState().getActiveCart();
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0].name).toBe('Cappuccino');
  });

  it('handles barcode scanner input', async () => {
    const user = userEvent.setup();
    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const barcodeInput = screen.getByPlaceholderText(/scan barcode/i);
    await user.type(barcodeInput, '1234567890{Enter}');

    const cart = useCartStore.getState().getActiveCart();
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0].productId).toBe('prod-1');
  });

  it('shows out of stock badge for products with zero stock', async () => {
    const outOfStockInventory = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        currentStock: 0,
        belowThreshold: false,
      },
    ];

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url.includes('/api/inventory')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                inventory: outOfStockInventory,
                pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
              }),
          });
        }
        if (url.includes('/api/categories')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ categories: mockCategories }),
          });
        }
        if (url.includes('/api/products')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                products: [mockProducts[0]],
                pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
              }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }
    );

    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('prevents adding out of stock products to cart', async () => {
    const user = userEvent.setup();

    const outOfStockInventory = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        locationId: 'loc-1',
        currentStock: 0,
        belowThreshold: false,
      },
    ];

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url.includes('/api/inventory')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                inventory: outOfStockInventory,
                pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
              }),
          });
        }
        if (url.includes('/api/categories')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ categories: mockCategories }),
          });
        }
        if (url.includes('/api/products')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                products: [mockProducts[0]],
                pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
              }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }
    );

    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const productCard = screen.getByText('Cappuccino').closest('button');
    expect(productCard).toBeDisabled();

    const cart = useCartStore.getState().getActiveCart();
    expect(cart).toBeNull();
  });

  it('shows empty state when no products found', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (url: string) => {
        if (url.includes('/api/products')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                products: [],
                pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
              }),
          });
        }
        if (url.includes('/api/categories')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ categories: mockCategories }),
          });
        }
        if (url.includes('/api/inventory')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                inventory: [],
                pagination: { page: 1, limit: 1000, total: 0, totalPages: 0 },
              }),
          });
        }
        return Promise.reject(new Error('Unknown endpoint'));
      }
    );

    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('No products found')).toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts', async () => {
    render(<ProductGrid locationId="loc-1" />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search products/i);
    const barcodeInput = screen.getByPlaceholderText(/scan barcode/i);

    // Ctrl+K should focus search
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(document.activeElement).toBe(searchInput);

    // Ctrl+B should focus barcode
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(document.activeElement).toBe(barcodeInput);
  });
});
