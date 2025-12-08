'use client';

import { useState } from 'react';
import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryTable } from '@/components/inventory/inventory-table';
import { LocationSelector } from '@/components/inventory/location-selector';
import { InventoryFilters } from '@/components/inventory/inventory-filters';
import { StockAdjustmentDialog } from '@/components/inventory/stock-adjustment-dialog';
import { useInventory, useLowStockItems } from '@/hooks/use-inventory';

export default function InventoryPage() {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null
  );
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);

  const { data: inventoryData, isLoading } = useInventory({
    locationId: selectedLocation || undefined,
    page,
    limit: 50,
  });

  const { data: lowStockData } = useLowStockItems(selectedLocation);

  // Calculate summary statistics
  const totalItems = inventoryData?.inventory.length || 0;
  const lowStockCount = lowStockData?.count || 0;
  const totalValue =
    inventoryData?.inventory.reduce((sum, item) => {
      return sum + item.currentStock * 10; // Placeholder, should use actual cost
    }, 0) || 0;
  const averageStock =
    totalItems > 0
      ? (inventoryData?.inventory.reduce(
          (sum, item) => sum + item.currentStock,
          0
        ) ?? 0) / totalItems
      : 0;

  // Filter inventory based on search
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
        <LocationSelector
          value={selectedLocation}
          onChange={setSelectedLocation}
        />
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
    </div>
  );
}
