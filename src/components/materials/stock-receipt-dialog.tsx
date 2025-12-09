'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const stockReceiptSchema = z.object({
  materialInventoryId: z.string().min(1, 'Material inventory is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  quantity: z
    .string()
    .refine((val) => parseFloat(val) > 0, 'Quantity must be positive'),
  cost: z
    .string()
    .refine((val) => parseFloat(val) >= 0, 'Cost must be non-negative'),
  expiryDate: z.string().optional(),
  remarks: z.string().optional(),
});

type StockReceiptFormValues = z.infer<typeof stockReceiptSchema>;

type MaterialInventory = {
  id: string;
  materialId: string;
  materialName: string;
  locationId: string;
  locationName: string;
  unitOfMeasure: string | null;
};

type StockReceiptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function StockReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
}: StockReceiptDialogProps) {
  const [loading, setLoading] = useState(false);
  const [materialInventories, setMaterialInventories] = useState<
    MaterialInventory[]
  >([]);
  const [selectedInventory, setSelectedInventory] =
    useState<MaterialInventory | null>(null);

  const form = useForm<StockReceiptFormValues>({
    resolver: zodResolver(stockReceiptSchema),
    defaultValues: {
      materialInventoryId: '',
      batchNumber: '',
      quantity: '',
      cost: '',
      expiryDate: '',
      remarks: '',
    },
  });

  useEffect(() => {
    const fetchMaterialInventories = async () => {
      try {
        const response = await fetch('/api/materials/inventory');
        if (!response.ok)
          throw new Error('Failed to fetch material inventories');

        const data = await response.json();
        setMaterialInventories(data.inventory || []);
      } catch (error) {
        console.error('Failed to load material inventories:', error);
        toast.error('Failed to load material inventories');
      }
    };

    if (open) {
      fetchMaterialInventories();
    }
  }, [open]);

  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'materialInventoryId') {
        const inventory = materialInventories.find(
          (inv) => inv.id === value.materialInventoryId
        );
        setSelectedInventory(inventory || null);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, materialInventories]);

  const onSubmit = async (data: StockReceiptFormValues) => {
    try {
      setLoading(true);

      const payload = {
        materialInventoryId: data.materialInventoryId,
        batchNumber: data.batchNumber,
        quantity: parseFloat(data.quantity),
        cost: parseFloat(data.cost),
        expiryDate: data.expiryDate || undefined,
        remarks: data.remarks || undefined,
      };

      const response = await fetch('/api/materials/inventory/receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to receive stock');
      }

      toast.success('Stock received successfully');
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to receive stock'
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Receive Material Stock</DialogTitle>
          <DialogDescription>
            Record incoming stock with batch details
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <FormField
            control={form.control}
            name='materialInventoryId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Material *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select material inventory' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {materialInventories.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.materialName} - {inv.locationName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedInventory && (
                  <FormDescription>
                    Unit: {selectedInventory.unitOfMeasure || 'Not specified'}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='batchNumber'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Number *</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., BATCH-001' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity *</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='cost'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Cost *</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Cost per unit</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='expiryDate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <div className='relative'>
                      <Input type='date' {...field} />
                      <Calendar className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none' />
                    </div>
                  </FormControl>
                  <FormDescription>Optional expiry date</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='remarks'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Input placeholder='Additional notes' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedInventory &&
            form.watch('quantity') &&
            form.watch('cost') && (
              <div className='p-4 bg-blue-50 rounded-lg border border-blue-200'>
                <div className='text-sm font-medium text-blue-900'>
                  Receipt Summary
                </div>
                <div className='mt-2 space-y-1 text-sm text-blue-700'>
                  <div>
                    Material:{' '}
                    <span className='font-medium'>
                      {selectedInventory.materialName}
                    </span>
                  </div>
                  <div>
                    Quantity:{' '}
                    <span className='font-medium'>
                      {form.watch('quantity')} {selectedInventory.unitOfMeasure}
                    </span>
                  </div>
                  <div>
                    Unit Cost:{' '}
                    <span className='font-medium'>${form.watch('cost')}</span>
                  </div>
                  <div className='pt-2 border-t border-blue-300'>
                    Total Cost:{' '}
                    <span className='font-bold text-lg'>
                      $
                      {(
                        parseFloat(form.watch('quantity') || '0') *
                        parseFloat(form.watch('cost') || '0')
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                form.reset();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Receive Stock
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
