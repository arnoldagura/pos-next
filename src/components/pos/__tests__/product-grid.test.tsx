import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGrid } from '../product-grid';
import { useCartStore } from '@/stores';

global.fetch = vi.fn();

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

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
    cost: '2.00',
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
    cost: '2.50',
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
    productName: 'Cappuccino',
    locationId: 'loc-1',
    locationName: 'Location 1',
    sku: 'CAP-001',
    unitPrice: '4.50',
    currentQuantity: '50',
    alertThreshold: '10',
    unitOfMeasure: 'cup',
    taxRate: '10',
    belowThreshold: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'inv-2',
    productId: 'prod-2',
    productName: 'Latte',
    locationId: 'loc-1',
    locationName: 'Location 1',
    sku: 'LAT-001',
    unitPrice: '5.00',
    currentQuantity: '3',
    alertThreshold: '10',
    unitOfMeasure: 'cup',
    taxRate: '10',
    belowThreshold: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

describe('ProductGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useCartStore.setState({
      activeCartId: null,
      carts: new Map(),
    });

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
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
              pagination: { page: 1, limit: 1000, total: 2, totalPages: 1 },
            }),
        });
      }
      if (url.includes('/api/product-inventories')) {
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
    });
  });

  it('renders product grid with products', async () => {
    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
      expect(screen.getByText('Latte')).toBeInTheDocument();
    });
  });

  it('displays product prices correctly', async () => {
    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('$4.50')).toBeInTheDocument();
      expect(screen.getByText('$5.00')).toBeInTheDocument();
    });
  });

  it('shows stock indicators when location is provided', async () => {
    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('50 cup available')).toBeInTheDocument();
      expect(screen.getByText('Low Stock')).toBeInTheDocument();
    });
  });

  it('filters products by search term', async () => {
    const user = userEvent.setup();
    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search products/i);
    await user.type(searchInput, 'Latte');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('search=Latte'));
    });
  });

  it('filters products by category', async () => {
    const user = userEvent.setup();
    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    // Open category filter popover
    const categoriesButton = screen.getByRole('button', { name: /categories/i });
    await user.click(categoriesButton);

    // Click Coffee checkbox label
    await waitFor(() => {
      expect(screen.getByText('Coffee')).toBeInTheDocument();
    });

    const coffeeCheckbox = screen.getByText('Coffee').closest('label');
    expect(coffeeCheckbox).not.toBeNull();
    await user.click(coffeeCheckbox!);

    // Category filtering is done client-side, so products should still be shown
    // (both products are in cat-1/Coffee)
    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });
  });

  it('adds product to cart when clicked', async () => {
    const user = userEvent.setup();
    render(<ProductGrid locationId='loc-1' />);

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

    // Add barcode endpoint mock
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: mockCategories }),
        });
      }
      if (url.includes('/api/products/barcode/')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              productId: 'prod-1',
              currentStock: 50,
            }),
        });
      }
      if (url.includes('/api/products')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              products: mockProducts,
              pagination: { page: 1, limit: 1000, total: 2, totalPages: 1 },
            }),
        });
      }
      if (url.includes('/api/product-inventories')) {
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
    });

    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const barcodeInput = screen.getByPlaceholderText(/scan barcode/i);
    await user.type(barcodeInput, '1234567890{Enter}');

    await waitFor(() => {
      const cart = useCartStore.getState().getActiveCart();
      expect(cart?.items).toHaveLength(1);
      expect(cart?.items[0].productId).toBe('prod-1');
    });
  });

  it('shows out of stock badge for products with zero stock', async () => {
    const outOfStockInventory = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Cappuccino',
        locationId: 'loc-1',
        locationName: 'Location 1',
        sku: 'CAP-001',
        unitPrice: '4.50',
        currentQuantity: '0',
        alertThreshold: '10',
        unitOfMeasure: 'cup',
        taxRate: '10',
        belowThreshold: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/product-inventories')) {
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
              pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
            }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });
  });

  it('prevents adding out of stock products to cart', async () => {
    const outOfStockInventory = [
      {
        id: 'inv-1',
        productId: 'prod-1',
        productName: 'Cappuccino',
        locationId: 'loc-1',
        locationName: 'Location 1',
        sku: 'CAP-001',
        unitPrice: '4.50',
        currentQuantity: '0',
        alertThreshold: '10',
        unitOfMeasure: 'cup',
        taxRate: '10',
        belowThreshold: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/product-inventories')) {
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
              pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
            }),
        });
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });

    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const productCard = screen.getByText('Cappuccino').closest('button');
    expect(productCard).toBeDisabled();

    const cart = useCartStore.getState().getActiveCart();
    expect(cart).toBeNull();
  });

  it('shows empty state when no products found', async () => {
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes('/api/products')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              products: [],
              pagination: { page: 1, limit: 1000, total: 0, totalPages: 0 },
            }),
        });
      }
      if (url.includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: mockCategories }),
        });
      }
      if (url.includes('/api/product-inventories')) {
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
    });

    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('No products found')).toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts', async () => {
    render(<ProductGrid locationId='loc-1' />);

    await waitFor(() => {
      expect(screen.getByText('Cappuccino')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search products/i);
    const barcodeInput = screen.getByPlaceholderText(/scan barcode/i);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(document.activeElement).toBe(searchInput);

    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(document.activeElement).toBe(barcodeInput);
  });
});
