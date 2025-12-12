'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
} from 'lucide-react';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ProductFormDialog } from './product-form-dialog';
import { Category } from '@/lib/types';
import { Product } from '@/lib/types/product';

type SortField = 'name' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export function ProductsClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set()
  );
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(
    undefined
  );

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (search) params.append('search', search);
      if (categoryFilter && categoryFilter !== 'all')
        params.append('categoryId', categoryFilter);
      if (statusFilter && statusFilter !== 'all')
        params.append('status', statusFilter);

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();

      // Sort products client-side
      const sorted = sortProducts(data.products || [], sortField, sortOrder);
      setProducts(sorted);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load products');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const sortProducts = (
    prods: Product[],
    field: SortField,
    order: SortOrder
  ) => {
    return [...prods].sort((a, b) => {
      let aVal: string | number = a[field];
      let bVal: string | number = b[field];

      if (field === 'createdAt') {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      }

      if (order === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    setProducts((prods) => sortProducts(prods, sortField, sortOrder));
  }, [sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className='h-4 w-4 ml-1' />;
    return sortOrder === 'asc' ? (
      <ArrowUp className='h-4 w-4 ml-1' />
    ) : (
      <ArrowDown className='h-4 w-4 ml-1' />
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  const toggleSelectProduct = (id: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedProducts(newSelected);
  };

  const handleBulkAction = async (
    action: 'activate' | 'deactivate' | 'delete'
  ) => {
    if (selectedProducts.size === 0) {
      toast.error('No products selected');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to ${action} ${selectedProducts.size} product(s)?`
    );
    if (!confirmed) return;

    try {
      const promises = Array.from(selectedProducts).map(async (id) => {
        if (action === 'delete') {
          return fetch(`/api/products/${id}`, { method: 'DELETE' });
        } else {
          return fetch(`/api/products/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: action === 'activate' }),
          });
        }
      });

      await Promise.all(promises);
      toast.success(
        `Successfully ${action}d ${selectedProducts.size} product(s)`
      );
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error) {
      toast.error(`Failed to ${action} products`);
      console.error(error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Status updated successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const handleExportToExcel = async () => {
    try {
      // Fetch all products without pagination
      const params = new URLSearchParams({ limit: '10000' });
      if (search) params.append('search', search);
      if (categoryFilter && categoryFilter !== 'all')
        params.append('categoryId', categoryFilter);
      if (statusFilter && statusFilter !== 'all')
        params.append('status', statusFilter);

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');

      const data = await response.json();
      const exportData = data.products || [];

      const headers = ['Name', 'SKU', 'Barcode', 'Category', 'Price', 'Status'];
      const rows = exportData.map((p: Product) => [
        p.name,
        categories.find((c) => c.id === p.categoryId)?.name || '',
        p.status ? 'Active' : 'Inactive',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row: string[]) =>
          row.map((cell) => `"${cell}"`).join(',')
        ),
      ].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Products exported successfully');
    } catch (error) {
      toast.error('Failed to export products');
      console.error(error);
    }
  };

  return (
    <div className='p-6 space-y-4'>
      {/* Search and Filters */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <div className='flex-1 relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
          <Input
            placeholder='Search by name...'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className='pl-9'
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className='w-full sm:w-[200px]'>
            <SelectValue placeholder='Filter by category' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='w-full sm:w-[150px]'>
            <SelectValue placeholder='Filter by status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Status</SelectItem>
            <SelectItem value='active'>Active</SelectItem>
            <SelectItem value='inactive'>Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleExportToExcel}
          variant='outline'
          className='w-full sm:w-auto'
        >
          <Download className='h-4 w-4 mr-2' />
          Export
        </Button>

        <Button
          className='w-full sm:w-auto'
          onClick={() => {
            setSelectedProduct(undefined);
            setShowProductDialog(true);
          }}
        >
          <Plus className='h-4 w-4 mr-2' />
          Add Product
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.size > 0 && (
        <div className='flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200'>
          <span className='text-sm font-medium'>
            {selectedProducts.size} selected
          </span>
          <Button
            size='sm'
            variant='outline'
            onClick={() => handleBulkAction('activate')}
          >
            Activate
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => handleBulkAction('deactivate')}
          >
            Deactivate
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => handleBulkAction('delete')}
            className='text-red-600 hover:text-red-700'
          >
            Delete
          </Button>
          <Button
            size='sm'
            variant='ghost'
            onClick={() => setSelectedProducts(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <div className='text-gray-500'>Loading products...</div>
        </div>
      ) : (
        <>
          <div className='rounded-md border overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[50px]'>
                    <Checkbox
                      checked={
                        products.length > 0 &&
                        selectedProducts.size === products.length
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className='w-[80px]'>Image</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('name')}
                      className='flex items-center hover:text-gray-900'
                    >
                      Name
                      {getSortIcon('name')}
                    </button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('createdAt')}
                      className='flex items-center hover:text-gray-900'
                    >
                      Created
                      {getSortIcon('createdAt')}
                    </button>
                  </TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className='text-center py-8'>
                      <p className='text-gray-500'>No products found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() =>
                            toggleSelectProduct(product.id)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={48}
                            height={48}
                            className='rounded object-cover'
                          />
                        ) : (
                          <div className='w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs'>
                            No image
                          </div>
                        )}
                      </TableCell>
                      <TableCell className='font-medium'>
                        {product.name}
                      </TableCell>
                      <TableCell>
                        {categories.find((c) => c.id === product.categoryId)
                          ?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            handleToggleStatus(product.id, product.status)
                          }
                        >
                          <Badge
                            variant={product.status ? 'default' : 'secondary'}
                          >
                            {product.status ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className='text-gray-600'>
                        {new Date(product.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className='text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm'>
                              <MoreVertical className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProduct(product);
                                setShowProductDialog(true);
                              }}
                            >
                              <Pencil className='h-4 w-4 mr-2' />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-red-600'
                              onClick={() => {
                                if (
                                  confirm(
                                    'Are you sure you want to delete this product?'
                                  )
                                ) {
                                  fetch(`/api/products/${product.id}`, {
                                    method: 'DELETE',
                                  })
                                    .then(() => {
                                      toast.success('Product deleted');
                                      fetchProducts();
                                    })
                                    .catch(() =>
                                      toast.error('Failed to delete product')
                                    );
                                }
                              }}
                            >
                              <Trash2 className='h-4 w-4 mr-2' />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className='flex flex-col sm:flex-row items-center justify-between gap-4'>
              <p className='text-sm text-gray-600'>
                Page {page} of {totalPages}
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Product Form Dialog */}
      <ProductFormDialog
        product={selectedProduct}
        open={showProductDialog}
        onOpenChange={setShowProductDialog}
        onSuccess={() => {
          fetchProducts();
          setSelectedProduct(undefined);
        }}
      />
    </div>
  );
}
