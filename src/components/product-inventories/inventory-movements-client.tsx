'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowUp, ArrowDown, FileText, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Movement {
  id: string;
  type: string;
  quantity: string;
  unitPrice: string | null;
  date: string;
  remarks: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string | null;
}

interface InventoryDetails {
  id: string;
  productName: string;
  productSku: string | null;
  locationName: string;
  currentStock: number;
  unitOfMeasure: string | null;
}

interface InventoryMovementsClientProps {
  inventoryId: string;
}

const movementTypeLabels: Record<string, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  adjustment: 'Adjustment',
  waste: 'Waste',
  transfer_in: 'Transfer In',
  transfer_out: 'Transfer Out',
  production_output: 'Production Output',
  receive_from_material: 'Receive from Material',
};

const movementTypeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  purchase: 'default',
  sale: 'secondary',
  adjustment: 'outline',
  waste: 'destructive',
  transfer_in: 'default',
  transfer_out: 'secondary',
  production_output: 'default',
  receive_from_material: 'default',
};

const positiveMovementTypes = [
  'purchase',
  'adjustment',
  'transfer_in',
  'production_output',
  'receive_from_material',
];

export default function InventoryMovementsClient({ inventoryId }: InventoryMovementsClientProps) {
  const router = useRouter();
  const [inventoryDetails, setInventoryDetails] = useState<InventoryDetails | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchInventoryDetails();
    fetchMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inventoryId, page, typeFilter]);

  const fetchInventoryDetails = async () => {
    try {
      const response = await fetch(`/api/product-inventories/${inventoryId}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventoryDetails(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory details');
    }
  };

  const fetchMovements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (typeFilter && typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`/api/product-inventories/${inventoryId}/movements?${params}`);
      if (!response.ok) throw new Error('Failed to fetch movements');

      const data = await response.json();
      setMovements(data.data);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching movements:', error);
      toast.error('Failed to load movements');
    } finally {
      setLoading(false);
    }
  };

  const isPositiveMovement = (type: string) => {
    return positiveMovementTypes.includes(type);
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='sm' onClick={() => router.push('/product-inventories')}>
          <ArrowLeft className='h-4 w-4 mr-2' />
          Back to Inventory
        </Button>
      </div>

      {inventoryDetails && (
        <div>
          <h1 className='text-3xl font-bold'>{inventoryDetails.productName}</h1>
          <p className='text-muted-foreground'>
            {inventoryDetails.locationName}
            {inventoryDetails.productSku && ` • SKU: ${inventoryDetails.productSku}`}
          </p>
        </div>
      )}

      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='pb-3'>
            <CardDescription>Current Stock</CardDescription>
            <CardTitle className='text-3xl'>
              {inventoryDetails
                ? `${inventoryDetails.currentStock.toFixed(2)} ${
                    inventoryDetails.unitOfMeasure || 'units'
                  }`
                : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-3'>
            <CardDescription>Total Movements</CardDescription>
            <CardTitle className='text-3xl'>{movements.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-3'>
            <CardDescription>Location</CardDescription>
            <CardTitle className='text-xl'>{inventoryDetails?.locationName || '-'}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className='flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between'>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className='w-full sm:w-[220px]'>
            <Filter className='h-4 w-4 mr-2' />
            <SelectValue placeholder='All Movement Types' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All Movement Types</SelectItem>
            <SelectItem value='purchase'>Purchase</SelectItem>
            <SelectItem value='sale'>Sale</SelectItem>
            <SelectItem value='adjustment'>Adjustment</SelectItem>
            <SelectItem value='waste'>Waste</SelectItem>
            <SelectItem value='transfer_in'>Transfer In</SelectItem>
            <SelectItem value='transfer_out'>Transfer Out</SelectItem>
            <SelectItem value='production_output'>Production Output</SelectItem>
            <SelectItem value='receive_from_material'>Receive from Material</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className='py-12'>
            <div className='flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
            </div>
          </CardContent>
        </Card>
      ) : movements.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <FileText className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-muted-foreground mb-4'>No movements found</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Movement History</CardTitle>
              <CardDescription>Track all inventory movements and transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className='text-right'>Quantity</TableHead>
                    <TableHead className='text-right'>Unit Price</TableHead>
                    <TableHead className='text-right'>Total Value</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => {
                    const quantity = parseFloat(movement.quantity);
                    const unitPrice = movement.unitPrice ? parseFloat(movement.unitPrice) : null;
                    const totalValue = unitPrice !== null ? Math.abs(quantity) * unitPrice : null;

                    return (
                      <TableRow key={movement.id}>
                        <TableCell className='font-medium'>
                          {format(new Date(movement.date), 'MMM dd, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={movementTypeColors[movement.type] || 'outline'}>
                            {isPositiveMovement(movement.type) ? (
                              <ArrowUp className='h-3 w-3 mr-1' />
                            ) : (
                              <ArrowDown className='h-3 w-3 mr-1' />
                            )}
                            {movementTypeLabels[movement.type] || movement.type}
                          </Badge>
                        </TableCell>
                        <TableCell className='text-right font-medium'>
                          <span className={quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                            {quantity > 0 ? '+' : ''}
                            {quantity.toFixed(2)} {inventoryDetails?.unitOfMeasure || 'units'}
                          </span>
                        </TableCell>
                        <TableCell className='text-right'>
                          {unitPrice !== null ? (
                            `$${unitPrice.toFixed(2)}`
                          ) : (
                            <span className='text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                        <TableCell className='text-right'>
                          {totalValue !== null ? (
                            `$${totalValue.toFixed(2)}`
                          ) : (
                            <span className='text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {movement.remarks || <span className='text-muted-foreground'>-</span>}
                        </TableCell>
                        <TableCell>
                          {movement.referenceType && movement.referenceId ? (
                            <span className='text-sm'>
                              {movement.referenceType}: {movement.referenceId}
                            </span>
                          ) : (
                            <span className='text-muted-foreground'>-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className='flex justify-center gap-2'>
              <Button variant='outline' disabled={page === 1} onClick={() => setPage(page - 1)}>
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
    </div>
  );
}
