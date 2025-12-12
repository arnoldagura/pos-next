'use client';

import { useState } from 'react';
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  InventoryItem,
  InventoryTable,
} from '@/components/product-inventories/inventory-table';
import { LocationSelector } from '@/components/product-inventories/location-selector';
import { InventoryFilters } from '@/components/product-inventories/inventory-filters';
import { StockAdjustmentDialog } from '@/components/product-inventories/stock-adjustment-dialog';
import EditInventorySettingsDialog from '@/components/product-inventories/edit-inventory-settings-dialog';
import CreateInventoryDialog from '@/components/product-inventories/create-inventory-dialog';
import {
  useProductInventory,
  useLowStockItems,
} from '@/hooks/use-product-inventory';

export default function InventoryPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null
  );
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [isEditSettingsOpen, setIsEditSettingsOpen] = useState(false);
  const [selectedInventoryForEdit, setSelectedInventoryForEdit] =
    useState<InventoryItem>({} as InventoryItem);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: inventoryData, isLoading } = useProductInventory({
    locationId: selectedLocation || undefined,
    page,
    limit: 50,
  });

  const { data: lowStockData } = useLowStockItems(selectedLocation);

  const totalItems = inventoryData?.inventory.length || 0;
  const lowStockCount = lowStockData?.count || 0;
  const totalValue =
    inventoryData?.inventory.reduce((sum, item) => {
      return sum + item.currentStock * 10;
    }, 0) || 0;
  const averageStock =
    totalItems > 0
      ? (inventoryData?.inventory.reduce(
          (sum, item) => sum + item.currentStock,
          0
        ) ?? 0) / totalItems
      : 0;

  const filteredInventory =
    inventoryData?.inventory.filter(
      (item) =>
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productSku?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleAdjustStock = (inventoryId: string) => {
    setSelectedInventoryId(inventoryId);
    setIsAdjustmentOpen(true);
  };

  const handleEditSettings = (item: InventoryItem) => {
    setSelectedInventoryForEdit(item);
    setIsEditSettingsOpen(true);
  };

  return (
    <div className='space-y-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Inventory Management</h1>
          <p className='text-muted-foreground'>
            Monitor and manage stock levels across all locations
          </p>
        </div>
        <div className='flex items-center gap-4'>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className='h-4 w-4 mr-2' />
            Add Product to Inventory
          </Button>
          <LocationSelector
            value={selectedLocation}
            onChange={setSelectedLocation}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Items</CardTitle>
            <Package className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{totalItems}</div>
            <p className='text-xs text-muted-foreground'>
              Active inventory items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className='h-4 w-4 text-yellow-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-yellow-600'>
              {lowStockCount}
            </div>
            <p className='text-xs text-muted-foreground'>
              Items below threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Value</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              ${totalValue.toLocaleString()}
            </div>
            <p className='text-xs text-muted-foreground'>
              Inventory value (estimated)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Avg. Stock Level
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{averageStock.toFixed(0)}</div>
            <p className='text-xs text-muted-foreground'>
              Average units per item
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <InventoryFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory List</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryTable
            data={filteredInventory}
            isLoading={isLoading}
            onAdjustStock={handleAdjustStock}
            onEditSettings={handleEditSettings}
            locationId={selectedLocation}
          />
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
        inventoryId={selectedInventoryId || ''}
        onSuccess={() => {
          setIsAdjustmentOpen(false);
          setSelectedInventoryId(null);
        }}
      />

      {/* Edit Settings Dialog */}
      {selectedInventoryForEdit && (
        <EditInventorySettingsDialog
          open={isEditSettingsOpen}
          onOpenChange={setIsEditSettingsOpen}
          inventory={selectedInventoryForEdit}
          onSuccess={() => {
            setIsEditSettingsOpen(false);
            setSelectedInventoryForEdit({} as InventoryItem);
            // Refetch inventory data
            window.location.reload();
          }}
        />
      )}

      {/* Create Inventory Dialog */}
      <CreateInventoryDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          // Refetch inventory data
          window.location.reload();
        }}
      />
    </div>
  );
}
