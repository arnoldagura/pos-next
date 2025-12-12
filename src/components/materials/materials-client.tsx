'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Download,
  PackagePlus,
  AlertTriangle,
} from 'lucide-react';
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
import { MaterialFormDialog } from './material-form-dialog';
import { StockReceiptDialog } from './stock-receipt-dialog';
import { ExpiryAlertsDialog } from './expiry-alerts-dialog';
import { MATERIAL_TYPES } from '@/lib/constants/material-types';
import { Category, Material } from '@/lib/types';

export function MaterialsClient() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<
    Material | undefined
  >(undefined);
  const [showStockReceiptDialog, setShowStockReceiptDialog] = useState(false);
  const [showExpiryAlertsDialog, setShowExpiryAlertsDialog] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/material-categories?isActive=true');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (search) params.append('search', search);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter && categoryFilter !== 'all')
        params.append('categoryId', categoryFilter);
      if (statusFilter && statusFilter !== 'all')
        params.append('status', statusFilter);

      const response = await fetch(`/api/materials?${params}`);
      if (!response.ok) throw new Error('Failed to fetch materials');

      const data = await response.json();
      setMaterials(data.materials || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      toast.error('Failed to load materials');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, typeFilter, categoryFilter, statusFilter]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('Status updated successfully');
      fetchMaterials();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const response = await fetch(`/api/materials/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete material');

      toast.success('Material deleted successfully');
      fetchMaterials();
    } catch (error) {
      toast.error('Failed to delete material');
      console.error(error);
    }
  };

  const handleExportToCSV = async () => {
    try {
      const params = new URLSearchParams({ limit: '10000' });
      if (search) params.append('search', search);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (categoryFilter && categoryFilter !== 'all')
        params.append('categoryId', categoryFilter);
      if (statusFilter && statusFilter !== 'all')
        params.append('status', statusFilter);

      const response = await fetch(`/api/materials?${params}`);
      if (!response.ok) throw new Error('Failed to fetch materials');

      const data = await response.json();
      const exportData = data.materials || [];

      const headers = [
        'Name',
        'SKU',
        'Type',
        'Category',
        'Supplier',
        'UOM',
        'Status',
      ];
      const rows = exportData.map((m: Material) => [
        m.name,
        m.sku || '',
        MATERIAL_TYPES[m.type],
        categories.find((c) => c.id === m.categoryId)?.name || '',
        m.unitOfMeasure,
        m.status ? 'Active' : 'Inactive',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row: string[]) =>
          row.map((cell) => `"${cell}"`).join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `materials-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Materials exported successfully');
    } catch (error) {
      toast.error('Failed to export materials');
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
            placeholder='Search by name, SKU, or description...'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className='pl-9'
          />
        </div>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className='w-full sm:w-[200px]'>
            <SelectValue placeholder='Filter by type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Types</SelectItem>
            {Object.entries(MATERIAL_TYPES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
            <SelectItem value='true'>Active</SelectItem>
            <SelectItem value='false'>Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Action Buttons */}
      <div className='flex flex-wrap gap-2'>
        <Button
          onClick={() => setShowExpiryAlertsDialog(true)}
          variant='outline'
        >
          <AlertTriangle className='h-4 w-4 mr-2' />
          Expiry Alerts
        </Button>

        <Button onClick={handleExportToCSV} variant='outline'>
          <Download className='h-4 w-4 mr-2' />
          Export
        </Button>

        <Button
          onClick={() => setShowStockReceiptDialog(true)}
          variant='outline'
        >
          <PackagePlus className='h-4 w-4 mr-2' />
          Receive Stock
        </Button>

        <Button
          onClick={() => {
            setSelectedMaterial(undefined);
            setShowMaterialDialog(true);
          }}
        >
          <Plus className='h-4 w-4 mr-2' />
          Add Material
        </Button>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <div className='text-gray-500'>Loading materials...</div>
        </div>
      ) : (
        <>
          <div className='rounded-md border overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className='text-center py-8'>
                      <p className='text-gray-500'>No materials found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className='font-medium'>
                        {material.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>
                          {MATERIAL_TYPES[material.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {categories.find((c) => c.id === material.categoryId)
                          ?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() =>
                            handleToggleStatus(material.id, material.status)
                          }
                        >
                          <Badge
                            variant={material.status ? 'default' : 'secondary'}
                          >
                            {material.status ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className='text-right'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm'>
                              •••
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedMaterial(material);
                                setShowMaterialDialog(true);
                              }}
                            >
                              <Pencil className='h-4 w-4 mr-2' />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-red-600'
                              onClick={() => handleDelete(material.id)}
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

      {/* Dialogs */}
      <MaterialFormDialog
        material={selectedMaterial}
        open={showMaterialDialog}
        onOpenChange={setShowMaterialDialog}
        onSuccess={() => {
          fetchMaterials();
          setSelectedMaterial(undefined);
        }}
      />

      <StockReceiptDialog
        open={showStockReceiptDialog}
        onOpenChange={setShowStockReceiptDialog}
        onSuccess={fetchMaterials}
      />

      <ExpiryAlertsDialog
        open={showExpiryAlertsDialog}
        onOpenChange={setShowExpiryAlertsDialog}
      />
    </div>
  );
}
