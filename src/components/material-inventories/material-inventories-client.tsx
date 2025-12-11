'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  MoreVertical,
  Search,
  Filter,
  Package,
  AlertTriangle,
  PackagePlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import MaterialInventoryFormDialog from './material-inventory-form-dialog';
import AddBatchDialog from './add-batch-dialog';
import EditSettingsDialog from './edit-settings-dialog';

interface MaterialInventory {
  id: string;
  materialId: string;
  locationId: string;
  alertThreshold: string;
  unitOfMeasure: string | null;
  totalQuantity: string;
  material: {
    id: string;
    name: string;
    sku: string | null;
    unitOfMeasure: string;
    type: string;
    defaultCost: string | null;
    image: string | null;
    category?: {
      id: string;
      name: string;
    } | null;
    supplier?: {
      id: string;
      name: string;
    } | null;
  };
  location: {
    id: string;
    name: string;
  };
  batches: Array<{
    id: string;
    batchNumber: string;
    quantity: string;
    cost: string;
    expiryDate: string | null;
  }>;
}
type ViewMode = 'cards' | 'table';

const materialTypeLabels: Record<string, string> = {
  raw_materials: 'Raw Materials',
  goods_for_resale: 'Goods for Resale',
  operation_supplies: 'Operation Supplies',
  wip_products: 'WIP Products',
};

export default function MaterialInventoriesClient() {
  const router = useRouter();
  const [inventories, setInventories] = useState<MaterialInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] =
    useState<MaterialInventory | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const fetchInventories = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (locationFilter && locationFilter !== 'all') {
        params.append('locationId', locationFilter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/material-inventories?${params}`);
      if (!response.ok) throw new Error('Failed to fetch inventories');

      const data = await response.json();
      setInventories(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching inventories:', error);
      toast.error('Failed to load material inventories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, locationFilter]);

  const handleAddBatch = (inventory: MaterialInventory) => {
    setSelectedInventory(inventory);
    setIsAddBatchOpen(true);
  };

  const handleViewMovements = (inventory: MaterialInventory) => {
    router.push(`/material-inventories/${inventory.id}/movements`);
  };

  const handleEditSettings = (inventory: MaterialInventory) => {
    setSelectedInventory(inventory);
    setIsEditSettingsOpen(true);
  };

  const isLowStock = (inventory: MaterialInventory) => {
    const quantity = parseFloat(inventory.totalQuantity);
    const threshold = parseFloat(inventory.alertThreshold);
    return quantity <= threshold;
  };

  const renderCards = () => (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {inventories.map((inventory) => (
        <Card
          key={inventory.id}
          className={`hover:shadow-lg transition-shadow ${
            isLowStock(inventory) ? 'border-orange-500 border-2' : ''
          }`}
        >
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='space-y-1 flex-1'>
                <CardTitle className='text-lg flex items-center gap-2'>
                  {inventory.material.image ? (
                    <Image
                      src={inventory.material.image}
                      alt={inventory.material.name}
                      className='w-10 h-10 rounded object-cover'
                    />
                  ) : (
                    <Package className='h-10 w-10 text-muted-foreground' />
                  )}
                  <div>
                    <div>{inventory.material.name}</div>
                    {inventory.material.sku && (
                      <div className='text-xs text-muted-foreground font-normal'>
                        SKU: {inventory.material.sku}
                      </div>
                    )}
                  </div>
                </CardTitle>
                <CardDescription>
                  {materialTypeLabels[inventory.material.type] ||
                    inventory.material.type}
                  {inventory.material.category && (
                    <span> • {inventory.material.category.name}</span>
                  )}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm'>
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAddBatch(inventory)}>
                    <PackagePlus className='h-4 w-4 mr-2' />
                    Add Batch
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleViewMovements(inventory)}>
                    View Movements
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditSettings(inventory)}>
                    Edit Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between items-center'>
                <span className='text-muted-foreground'>Current Stock:</span>
                <span className='font-bold text-lg'>
                  {parseFloat(inventory.totalQuantity).toFixed(2)}{' '}
                  {inventory.material.unitOfMeasure}
                </span>
              </div>
              {isLowStock(inventory) && (
                <div className='flex items-center gap-2 text-orange-600 font-medium'>
                  <AlertTriangle className='h-4 w-4' />
                  <span>Low Stock!</span>
                </div>
              )}
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Alert Threshold:</span>
                <span>
                  {parseFloat(inventory.alertThreshold).toFixed(2)}{' '}
                  {inventory.material.unitOfMeasure}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Location:</span>
                <span className='font-medium'>{inventory.location.name}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Batches:</span>
                <span className='font-medium'>{inventory.batches.length}</span>
              </div>
              {inventory.material.supplier && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Supplier:</span>
                  <span className='font-medium'>
                    {inventory.material.supplier.name}
                  </span>
                </div>
              )}
              {inventory.material.defaultCost && (
                <div className='flex justify-between pt-2 border-t'>
                  <span className='text-muted-foreground'>Default Cost:</span>
                  <span className='font-medium'>
                    ${parseFloat(inventory.material.defaultCost).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderTable = () => (
    <div className='border rounded-lg'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className='text-right'>Stock</TableHead>
            <TableHead className='text-right'>Alert At</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventories.map((inventory) => (
            <TableRow key={inventory.id}>
              <TableCell className='font-medium'>
                <div className='flex items-center gap-2'>
                  {inventory.material.image ? (
                    <Image
                      src={inventory.material.image}
                      alt={inventory.material.name}
                      className='w-8 h-8 rounded object-cover'
                    />
                  ) : (
                    <Package className='h-8 w-8 text-muted-foreground' />
                  )}
                  {inventory.material.name}
                </div>
              </TableCell>
              <TableCell>{inventory.material.sku || '-'}</TableCell>
              <TableCell>
                <Badge variant='outline'>
                  {materialTypeLabels[inventory.material.type]}
                </Badge>
              </TableCell>
              <TableCell>{inventory.location.name}</TableCell>
              <TableCell className='text-right'>
                {parseFloat(inventory.totalQuantity).toFixed(2)}{' '}
                {inventory.material.unitOfMeasure}
              </TableCell>
              <TableCell className='text-right'>
                {parseFloat(inventory.alertThreshold).toFixed(2)}{' '}
                {inventory.material.unitOfMeasure}
              </TableCell>
              <TableCell>
                {isLowStock(inventory) ? (
                  <Badge variant='destructive' className='bg-orange-500'>
                    <AlertTriangle className='h-3 w-3 mr-1' />
                    Low Stock
                  </Badge>
                ) : (
                  <Badge variant='outline' className='bg-green-50'>
                    In Stock
                  </Badge>
                )}
              </TableCell>
              <TableCell className='text-right'>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='sm'>
                      <MoreVertical className='h-4 w-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAddBatch(inventory)}>
                      <PackagePlus className='h-4 w-4 mr-2' />
                      Add Batch
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewMovements(inventory)}>
                      View Movements
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEditSettings(inventory)}>
                      Edit Settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className='space-y-4'>
      <div className='flex flex-col sm:flex-row gap-4'>
        <div className='relative flex-1'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search materials...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                fetchInventories();
              }
            }}
            className='pl-8'
          />
        </div>

        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className='w-full sm:w-[180px]'>
            <Filter className='h-4 w-4 mr-2' />
            <SelectValue placeholder='All Locations' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Locations</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
        >
          <SelectTrigger className='w-full sm:w-[120px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='cards'>Cards</SelectItem>
            <SelectItem value='table'>Table</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className='h-4 w-4 mr-2' />
          New Material
        </Button>
      </div>

      {loading ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {[...Array(6)].map((_, i) => (
            <Card key={i} className='animate-pulse'>
              <CardHeader className='space-y-2'>
                <div className='h-4 bg-gray-200 rounded w-3/4'></div>
                <div className='h-3 bg-gray-200 rounded w-1/2'></div>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  <div className='h-3 bg-gray-200 rounded'></div>
                  <div className='h-3 bg-gray-200 rounded w-5/6'></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : inventories.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Package className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-muted-foreground mb-4'>
              No material inventories found
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className='h-4 w-4 mr-2' />
              Add First Material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {viewMode === 'cards' ? renderCards() : renderTable()}

          {totalPages > 1 && (
            <div className='flex justify-center gap-2'>
              <Button
                variant='outline'
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <div className='flex items-center px-4'>
                Page {page} of {totalPages}
              </div>
              <Button
                variant='outline'
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <MaterialInventoryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchInventories}
      />

      {selectedInventory && (
        <>
          <AddBatchDialog
            open={isAddBatchOpen}
            onOpenChange={setIsAddBatchOpen}
            inventory={selectedInventory}
            onSuccess={fetchInventories}
          />
          <EditSettingsDialog
            open={isEditSettingsOpen}
            onOpenChange={setIsEditSettingsOpen}
            inventory={selectedInventory}
            onSuccess={fetchInventories}
          />
        </>
      )}
    </div>
  );
}
