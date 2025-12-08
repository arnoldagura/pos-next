'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StockAdjustmentForm } from '@/components/inventory/stock-adjustment-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Package, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  locationName: string;
  currentStock: number;
  alertThreshold: string;
  unitOfMeasure?: string | null;
  belowThreshold: boolean;
}

async function fetchInventory(locationId?: string): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (locationId) {
    params.append('locationId', locationId);
  }

  const response = await fetch(`/api/inventory?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Failed to fetch inventory');
  }
  const data = await response.json();
  return data.inventory;
}

export default function StockAdjustmentPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInventory, setSelectedInventory] = useState<InventoryItem | null>(null);

  const { data: inventory, isLoading, error } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => fetchInventory(),
  });

  const filteredInventory = inventory?.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSuccess = () => {
    setSelectedInventory(null);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stock Adjustment</h1>
        <p className="text-muted-foreground">
          Make corrections to inventory quantities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Selection Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Select Product</CardTitle>
            <CardDescription>
              Choose a product to adjust its stock level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Product List */}
            <div className="border rounded-lg">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="m-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load inventory. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              {filteredInventory && filteredInventory.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">No products found</p>
                </div>
              )}

              {filteredInventory && filteredInventory.length > 0 && (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInventory.map((item) => (
                        <TableRow
                          key={item.id}
                          className={`cursor-pointer ${
                            selectedInventory?.id === item.id
                              ? 'bg-muted'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedInventory(item)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.productSku} • {item.locationName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">
                                {item.currentStock.toFixed(2)}
                              </span>
                              {item.unitOfMeasure && (
                                <span className="text-xs text-muted-foreground">
                                  {item.unitOfMeasure}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.belowThreshold && (
                              <Badge variant="destructive" className="text-xs">
                                Low
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Adjustment Form Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Adjustment Details</CardTitle>
            <CardDescription>
              {selectedInventory
                ? 'Enter adjustment details below'
                : 'Select a product to begin'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedInventory ? (
              <StockAdjustmentForm
                inventory={selectedInventory}
                onSuccess={handleSuccess}
                onCancel={() => setSelectedInventory(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Select a product from the list to make an adjustment
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
