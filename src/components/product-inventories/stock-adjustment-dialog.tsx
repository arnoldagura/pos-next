'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdjustStock } from '@/hooks/use-product-inventory';

const adjustmentSchema = z.object({
  adjustmentType: z.enum(['add', 'subtract']),
  quantity: z.number().positive('Quantity must be positive'),
  remarks: z.string().min(1, 'Remarks are required'),
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryId: string;
  onSuccess?: () => void;
}

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  inventoryId,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const adjustStockMutation = useAdjustStock();

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      adjustmentType: 'add',
      quantity: 0,
      remarks: '',
    },
  });

  const onSubmit = async (data: AdjustmentFormValues) => {
    setIsSubmitting(true);
    try {
      const adjustmentQuantity =
        data.adjustmentType === 'subtract' ? -data.quantity : data.quantity;

      await adjustStockMutation.mutateAsync({
        inventoryId,
        quantity: adjustmentQuantity,
        remarks: data.remarks,
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Error adjusting stock:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
          <DialogDescription>
            Make manual adjustments to inventory levels
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <FormField
            control={form.control}
            name='adjustmentType'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adjustment Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select adjustment type' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='add'>Add Stock</SelectItem>
                    <SelectItem value='subtract'>Subtract Stock</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose whether to add or remove stock
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='quantity'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='Enter quantity'
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='remarks'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Textarea placeholder='Reason for adjustment...' {...field} />
                </FormControl>
                <FormDescription>
                  Provide a reason for this stock adjustment
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='flex gap-3 justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Adjusting...' : 'Adjust Stock'}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
