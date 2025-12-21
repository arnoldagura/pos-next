'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

type ExpiringBatch = {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: string;
  cost: string;
  materialInventoryId: string;
  materialId: string;
  materialName: string;
  materialSku: string | null;
  materialType: string;
  locationId: string;
  locationName: string;
  unitOfMeasure: string | null;
  daysUntilExpiry: number;
};

type ExpiryAlertsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ExpiryAlertsDialog({
  open,
  onOpenChange,
}: ExpiryAlertsDialogProps) {
  const [loading, setLoading] = useState(true);
  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [daysFilter, setDaysFilter] = useState('30');

  useEffect(() => {
    const fetchExpiringMaterials = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ days: daysFilter });

        const response = await fetch(`/api/materials/expiring?${params}`);
        if (!response.ok) throw new Error('Failed to fetch expiring materials');

        const data = await response.json();
        setExpiringBatches(data.expiringBatches || []);
      } catch (error) {
        console.error('Failed to load expiring materials:', error);
        toast.error('Failed to load expiring materials');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchExpiringMaterials();
    }
  }, [open, daysFilter]);

  const getUrgencyBadge = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) {
      return (
        <Badge variant='destructive' className='gap-1'>
          <AlertTriangle className='h-3 w-3' />
          Critical
        </Badge>
      );
    } else if (daysUntilExpiry <= 14) {
      return (
        <Badge variant='default' className='gap-1 bg-orange-500'>
          <AlertTriangle className='h-3 w-3' />
          Warning
        </Badge>
      );
    } else {
      return (
        <Badge variant='secondary' className='gap-1'>
          <Calendar className='h-3 w-3' />
          Notice
        </Badge>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-orange-500' />
            Expiry Alerts
          </DialogTitle>
          <DialogDescription>
            Materials expiring soon - take action before they expire
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>
                Show items expiring within:
              </span>
              <Select value={daysFilter} onValueChange={setDaysFilter}>
                <SelectTrigger className='w-[150px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='7'>7 days</SelectItem>
                  <SelectItem value='14'>14 days</SelectItem>
                  <SelectItem value='30'>30 days</SelectItem>
                  <SelectItem value='60'>60 days</SelectItem>
                  <SelectItem value='90'>90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {expiringBatches.length > 0 && (
              <div className='text-sm text-gray-600'>
                <span className='font-medium'>{expiringBatches.length}</span>{' '}
                batch{expiringBatches.length !== 1 ? 'es' : ''} expiring
              </div>
            )}
          </div>

          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='text-gray-500'>Loading expiry alerts...</div>
            </div>
          ) : expiringBatches.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <Package className='h-12 w-12 text-gray-300 mb-3' />
              <p className='text-gray-500 font-medium'>
                No materials expiring soon
              </p>
              <p className='text-sm text-gray-400 mt-1'>
                All materials are within safe expiry dates
              </p>
            </div>
          ) : (
            <div className='rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto'>
              <Table>
                <TableHeader className='sticky top-0  z-10'>
                  <TableRow>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead className='text-right'>
                      Days Until Expiry
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringBatches.map((batch) => (
                    <TableRow key={batch.batchId}>
                      <TableCell>
                        {getUrgencyBadge(batch.daysUntilExpiry)}
                      </TableCell>
                      <TableCell>
                        <div className='font-medium'>{batch.materialName}</div>
                        {batch.materialSku && (
                          <div className='text-xs text-gray-500'>
                            SKU: {batch.materialSku}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className='font-mono text-sm'>
                        {batch.batchNumber}
                      </TableCell>
                      <TableCell>{batch.locationName}</TableCell>
                      <TableCell>
                        {parseFloat(batch.quantity).toFixed(2)}{' '}
                        {batch.unitOfMeasure || 'units'}
                      </TableCell>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          <Calendar className='h-3 w-3 text-gray-400' />
                          {new Date(batch.expiryDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className='text-right'>
                        <span
                          className={`font-medium ${
                            batch.daysUntilExpiry <= 7
                              ? 'text-red-600'
                              : batch.daysUntilExpiry <= 14
                              ? 'text-orange-600'
                              : 'text-gray-700'
                          }`}
                        >
                          {batch.daysUntilExpiry} day
                          {batch.daysUntilExpiry !== 1 ? 's' : ''}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className='flex justify-end'>
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
