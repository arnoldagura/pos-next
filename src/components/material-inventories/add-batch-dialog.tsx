'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { BatchDialogMaterialInventory } from '@/lib/types';

const formSchema = z.object({
  batchNumber: z.string().min(1, 'Batch number is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  cost: z.string().min(1, 'Cost is required'),
  expiryDate: z.string().optional(),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: BatchDialogMaterialInventory;
  onSuccess: () => void;
}

export default function AddBatchDialog({
  open,
  onOpenChange,
  inventory,
  onSuccess,
}: AddBatchDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      batchNumber: '',
      quantity: '',
      cost: '',
      expiryDate: '',
      remarks: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);
      console.log('Submitting values:', values);
      console.log('inventory:', inventory);
      const response = await fetch(`/api/material-inventories/${inventory.id}/add-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          materialId: inventory.id,
          unitOfMeasure: inventory.unitOfMeasure,
          locationId: inventory.location.id,
          quantity: parseFloat(values.quantity),
          cost: parseFloat(values.cost),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add batch');
      }

      toast.success('Batch added successfully');
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding batch:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add batch');
    } finally {
      setSubmitting(false);
    }
  };

  const quantity = form.watch('quantity');
  const cost = form.watch('cost');
  const unitPrice =
    quantity && cost ? (parseFloat(cost) / parseFloat(quantity)).toFixed(2) : '0.00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Add Batch to Inventory</DialogTitle>
          <DialogDescription>
            Add a new batch of {inventory.material.name} to {inventory.location.name}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <FormField
            control={form.control}
            name='batchNumber'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch Number *</FormLabel>
                <FormControl>
                  <Input placeholder='e.g., BATCH-001' {...field} />
                </FormControl>
                <FormDescription>Unique identifier for this batch</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='quantity'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity *</FormLabel>
                  <FormControl>
                    <Input type='number' step='0.01' min='0.01' placeholder='0.00' {...field} />
                  </FormControl>
                  <FormDescription>{inventory.unitOfMeasure}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='cost'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Cost *</FormLabel>
                  <FormControl>
                    <Input type='number' step='0.01' min='0' placeholder='0.00' {...field} />
                  </FormControl>
                  <FormDescription>Unit: ${unitPrice}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='expiryDate'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Expiry Date (Optional)</FormLabel>
                <FormControl>
                  <Input type='date' {...field} />
                </FormControl>
                <FormDescription>When does this batch expire?</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='remarks'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder='Add any notes about this batch...' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={submitting}>
              {submitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Add Batch
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
