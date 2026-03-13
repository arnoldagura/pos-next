'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Barcode,
  ShoppingCart,
  AlertCircle,
  Filter,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useCartStore } from '@/stores';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';
import { ProductInventoryItem, ProductPosItem } from '@/lib/types';

type Category = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};

interface ProductGridProps {
  locationId?: string;
}

export function ProductGrid({ locationId }: ProductGridProps) {
  const [products, setProducts] = useState<ProductPosItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductPosItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<Map<string, ProductInventoryItem>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [barcodeInput, setBarcodeInput] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { addItem } = useCartStore();

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      if (error) {
        console.log('error', error);
      }
      toast.error('Failed to load categories');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: 'active',
        limit: '1000',
      });

      if (search) params.append('search', search);

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      console.log('data', data);
      setAllProducts(data.products || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchInventory = useCallback(async () => {
    if (!locationId) return;

    try {
      const params = new URLSearchParams({
        locationId,
        limit: '1000',
      });

      const response = await fetch(`/api/product-inventories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');

      const data = await response.json();
      const inventoryMap = new Map<string, ProductInventoryItem>();

      (data.inventory || []).forEach((item: ProductInventoryItem) => {
        inventoryMap.set(item.productId, item);
      });

      setInventory(inventoryMap);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  }, [locationId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (locationId) {
      fetchInventory();
    }
  }, [locationId, fetchInventory]);

  useEffect(() => {
    if (selectedCategories.size === 0) {
      setProducts(allProducts);
    } else {
      const filtered = allProducts.filter(
        (product) =>
          product.categoryId && selectedCategories.has(product.categoryId)
      );
      setProducts(filtered);
    }
  }, [allProducts, selectedCategories]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      }

      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current) {
          setSearch('');
          searchInputRef.current?.blur();
        }
        if (document.activeElement === barcodeInputRef.current) {
          setBarcodeInput('');
          barcodeInputRef.current?.blur();
        }
      }
    };

    const handleFocusSearch = () => searchInputRef.current?.focus();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pos:focus-search', handleFocusSearch);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pos:focus-search', handleFocusSearch);
    };
  }, []);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const clearCategoryFilters = () => {
    setSelectedCategories(new Set());
  };

  const handleAddToCart = useCallback(
    (product: ProductPosItem) => {
      const stockItem = inventory.get(product.id);

      if (locationId && !stockItem) {
        toast.error('Product not available at this location');
        return;
      }

      if (
        locationId &&
        stockItem &&
        parseFloat(stockItem.currentQuantity ?? '0') <= 0
      ) {
        toast.error('Product is out of stock');
        return;
      }

      const price = stockItem?.unitPrice
        ? parseFloat(stockItem.unitPrice)
        : parseFloat(product.sellingPrice);
      const taxRate = stockItem?.taxRate
        ? parseFloat(stockItem.taxRate)
        : parseFloat(product.taxRate);

      addItem({
        productId: product.id,
        name: product.name,
        price,
        quantity: 1,
        discount: 0,
        discountType: 'fixed',
        taxRate,
        image: product.image || undefined,
        sku: product.sku || undefined,
      });

      toast.success(`${product.name} added to cart`);
    },
    [inventory, locationId, addItem]
  );

  const handleBarcodeSubmit = useCallback(
    async (barcode: string) => {
      try {
        const params = new URLSearchParams({ code: barcode });
        if (locationId) params.append('locationId', locationId);

        const response = await fetch(
          `/api/products/barcode/${barcode}?${params}`
        );

        if (!response.ok) {
          toast.error('Product not found');
          setBarcodeInput('');
          return;
        }

        const inventoryItem = await response.json();

        const product = allProducts.find(
          (p) => p.id === inventoryItem.productId
        );

        if (!product) {
          toast.error('Product not found');
          setBarcodeInput('');
          return;
        }

        if (locationId && inventoryItem.currentStock <= 0) {
          toast.error('Product is out of stock');
          setBarcodeInput('');
          return;
        }

        handleAddToCart(product);
        setBarcodeInput('');
        toast.success(`${product.name} added to cart`);
      } catch (error) {
        console.error('Error scanning barcode:', error);
        toast.error('Failed to scan barcode');
        setBarcodeInput('');
      }
    },
    [allProducts, handleAddToCart, locationId]
  );

  const getStockStatus = (product: ProductPosItem) => {
    if (!locationId) return null;

    const stockItem = inventory.get(product.id);
    console.log('stockItem', stockItem);
    if (!stockItem) return { status: 'unknown', stock: 0 };

    if (parseFloat(stockItem.currentQuantity ?? '0') <= 0) {
      return { status: 'out', stock: 0 };
    } else if (stockItem.belowThreshold) {
      return {
        status: 'low',
        stock: parseFloat(stockItem.currentQuantity ?? '0'),
      };
    } else {
      return {
        status: 'in-stock',
        stock: parseFloat(stockItem.currentQuantity ?? '0'),
      };
    }
  };

  return (
    <div className='flex flex-col h-full'>
      <div className='p-4 border-b  space-y-3'>
        <div className='flex gap-2'>
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
            <Input
              ref={searchInputRef}
              placeholder='Search products... (Ctrl+K)'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='pl-9'
            />
          </div>

          <div className='w-64 relative'>
            <Barcode className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
            <Input
              ref={barcodeInputRef}
              placeholder='Scan barcode... (Ctrl+B)'
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && barcodeInput) {
                  handleBarcodeSubmit(barcodeInput);
                }
              }}
              className='pl-9'
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' className='gap-2'>
                <Filter className='h-4 w-4' />
                Categories
                {selectedCategories.size > 0 && (
                  <Badge variant='secondary' className='ml-1'>
                    {selectedCategories.size}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent className='w-64' align='end'>
              <div className='flex items-center justify-between mb-2'>
                <span className='font-medium text-sm'>Filter by Category</span>

                {selectedCategories.size > 0 && (
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={clearCategoryFilters}
                    className='h-6 px-2 text-xs'
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className='space-y-2'>
                {categories.length === 0 ? (
                  <div className='text-center text-sm text-gray-500 py-4'>
                    No categories available
                  </div>
                ) : (
                  categories.map((category) => (
                    <label
                      key={category.id}
                      className='flex items-center gap-2 text-sm cursor-pointer'
                    >
                      <Checkbox
                        checked={selectedCategories.has(category.id)}
                        onCheckedChange={() => toggleCategory(category.id)}
                      />
                      {category.name}
                    </label>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex gap-4 text-xs text-gray-500'>
            <span>
              <kbd className='px-1.5 py-0.5 bg-gray-100 rounded border'>
                Ctrl+K
              </kbd>{' '}
              Search
            </span>
            <span>
              <kbd className='px-1.5 py-0.5 bg-gray-100 rounded border'>
                Ctrl+B
              </kbd>{' '}
              Barcode
            </span>
            <span>
              <kbd className='px-1.5 py-0.5 bg-gray-100 rounded border'>
                Esc
              </kbd>{' '}
              Clear
            </span>
            <span>
              <kbd className='px-1.5 py-0.5 bg-gray-100 rounded border'>
                ?
              </kbd>{' '}
              All shortcuts
            </span>
          </div>

          {selectedCategories.size > 0 && (
            <div className='flex gap-2 flex-wrap items-center'>
              {Array.from(selectedCategories).map((categoryId) => {
                const category = categories.find((c) => c.id === categoryId);
                return category ? (
                  <Badge
                    key={categoryId}
                    variant='secondary'
                    className='gap-1 pr-1'
                  >
                    {category.name}
                    <button
                      onClick={() => toggleCategory(categoryId)}
                      className='ml-1 hover:bg-gray-300 rounded-full p-0.5'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </Badge>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 '>
        {loading ? (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-gray-500'>
            <ShoppingCart className='h-12 w-12 mb-4 text-gray-300' />
            <p className='text-lg font-medium'>No products found</p>
            <p className='text-sm'>
              {selectedCategories.size > 0 || search
                ? 'Try adjusting your search or filters'
                : 'No products available'}
            </p>
            {selectedCategories.size > 0 && (
              <Button
                variant='outline'
                size='sm'
                onClick={clearCategoryFilters}
                className='mt-4'
              >
                Clear Category Filters
              </Button>
            )}
          </div>
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                stockStatus={getStockStatus(product)}
                inventoryItem={inventory.get(product.id)}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: ProductPosItem;
  stockStatus: { status: string; stock: number } | null;
  inventoryItem?: ProductInventoryItem;
  onAddToCart: (product: ProductPosItem) => void;
}

function ProductCard({
  product,
  stockStatus,
  inventoryItem,
  onAddToCart,
}: ProductCardProps) {
  const isOutOfStock = stockStatus?.status === 'out';
  const isLowStock = stockStatus?.status === 'low';

  const displayPrice = inventoryItem?.unitPrice
    ? parseFloat(inventoryItem.unitPrice)
    : parseFloat(product.sellingPrice);
  const displayUnit =
    inventoryItem?.unitOfMeasure || product.unitOfMeasure || 'units';

  return (
    <button
      onClick={() => !isOutOfStock && onAddToCart(product)}
      disabled={isOutOfStock}
      className={cn(
        'group relative flex flex-col  rounded-lg border p-3 transition-all',
        'hover:shadow-lg hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500',
        isOutOfStock
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer active:scale-95'
      )}
    >
      <div className='relative aspect-square mb-2 rounded-md overflow-hidden bg-gray-100'>
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className='object-cover'
            sizes='(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw'
          />
        ) : (
          <div className='w-full h-full flex items-center justify-center'>
            <ShoppingCart className='h-8 w-8 text-gray-300' />
          </div>
        )}

        {stockStatus && (
          <div className='absolute top-2 right-2'>
            {isOutOfStock && (
              <Badge variant='destructive' className='text-xs'>
                Out of Stock
              </Badge>
            )}
            {isLowStock && (
              <Badge
                variant='secondary'
                className='text-xs bg-yellow-500 text-white border-yellow-600'
              >
                <AlertCircle className='h-3 w-3 mr-1' />
                Low Stock
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className='flex-1 flex flex-col text-left'>
        <h3 className='font-medium text-sm line-clamp-2 mb-1'>
          {product.name}
        </h3>

        {product.sku && (
          <p className='text-xs text-gray-500 mb-1'>SKU: {product.sku}</p>
        )}

        <div className='mt-auto'>
          <p className='text-lg font-bold text-blue-600'>
            ${displayPrice.toFixed(2)}
          </p>

          {stockStatus && stockStatus.stock > 0 && (
            <p className='text-xs text-gray-500'>
              {stockStatus.stock} {displayUnit} available
            </p>
          )}
        </div>
      </div>

      {!isOutOfStock && (
        <div className='absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors rounded-lg pointer-events-none flex items-center justify-center'>
          <div className='opacity-0 group-hover:opacity-100 transition-opacity'>
            <div className='bg-blue-600 text-white px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1'>
              <ShoppingCart className='h-4 w-4' />
              Add to Cart
            </div>
          </div>
        </div>
      )}
    </button>
  );
}

function ProductCardSkeleton() {
  return (
    <div className='flex flex-col  rounded-lg border p-3'>
      <Skeleton className='aspect-square mb-2 rounded-md' />
      <Skeleton className='h-4 w-3/4 mb-2' />
      <Skeleton className='h-3 w-1/2 mb-2' />
      <Skeleton className='h-6 w-1/3' />
    </div>
  );
}
