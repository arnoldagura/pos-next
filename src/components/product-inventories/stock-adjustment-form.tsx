'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const ADJUSTMENT_REASONS = {
  cycle_count: 'Cycle Count',
  damaged: 'Damaged',
  lost: 'Lost',
  found: 'Found',
  other: 'Other',
} as const;

type AdjustmentReason = keyof typeof ADJUSTMENT_REASONS;

const adjustmentFormSchema = z.object({
  inventoryId: z.string().min(1, 'Please select a product'),
  quantity: z.number().refine((val) => val !== 0, 'Quantity cannot be zero'),
  reason: z.string().min(1, 'Please select a reason'),
  remarks: z.string().min(1, 'Remarks are required'),
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

interface StockAdjustmentFormProps {
  inventory?: {
    id: string;
    productName: string;
    productSku: string;
    currentStock: number;
    unitOfMeasure?: string | null;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StockAdjustmentForm({
  inventory,
  onSuccess,
  onCancel,
}: StockAdjustmentFormProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValues, setPendingValues] =
    useState<AdjustmentFormValues | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      inventoryId: inventory?.id || '',
      quantity: 0,
      reason: '',
      remarks: '',
    },
  });

  const currentStock = inventory?.currentStock || 0;
  const quantityValue = useWatch({
    control: form.control,
    name: 'quantity',
  });
  const newStock = currentStock + (quantityValue || 0);

  const adjustmentMutation = useMutation({
    mutationFn: async (values: AdjustmentFormValues) => {
      const response = await fetch('/api/product-inventories/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventoryId: values.inventoryId,
          quantity: values.quantity,
          remarks: `${ADJUSTMENT_REASONS[values.reason as AdjustmentReason]}: ${
            values.remarks
          }`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to adjust stock');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      form.reset();
      setShowConfirmDialog(false);
      setPendingValues(null);
      onSuccess?.();
    },
  });

  const handleSubmit = (values: AdjustmentFormValues) => {
    setPendingValues(values);
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (pendingValues) {
      adjustmentMutation.mutate(pendingValues);
    }
  };

  const handleCancel = () => {
    setShowConfirmDialog(false);
    setPendingValues(null);
  };

  const isIncrease = (quantityValue || 0) > 0;
  const showWarning = newStock < 0;

  return (
    <>
      <Form form={form} onSubmit={handleSubmit} className='space-y-6'>
        {/* Product Information */}
        {inventory && (
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                {inventory.productName} ({inventory.productSku})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-sm text-muted-foreground'>Current Stock</p>
                  <p className='text-2xl font-bold'>
                    {currentStock.toFixed(2)}
                  </p>
                  {inventory.unitOfMeasure && (
                    <p className='text-sm text-muted-foreground'>
                      {inventory.unitOfMeasure}
                    </p>
                  )}
                </div>
                <div>
                  <p className='text-sm text-muted-foreground'>
                    New Stock (Preview)
                  </p>
                  <div className='flex items-center gap-2'>
                    <p
                      className={`text-2xl font-bold ${
                        showWarning ? 'text-destructive' : 'text-primary'
                      }`}
                    >
                      {newStock.toFixed(2)}
                    </p>
                    {isIncrease ? (
                      <TrendingUp className='h-5 w-5 text-green-600' />
                    ) : (
                      <TrendingDown className='h-5 w-5 text-red-600' />
                    )}
                  </div>
                  {showWarning && (
                    <Alert variant='destructive' className='mt-2'>
                      <AlertTriangle className='h-4 w-4' />
                      <AlertDescription>
                        Warning: Adjustment will result in negative stock
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Adjustment Details */}
        <div className='space-y-4'>
          <FormField
            control={form.control}
            name='quantity'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adjustment Quantity</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    placeholder='Enter quantity (positive to add, negative to subtract)'
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseFloat(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormDescription>
                  Use positive numbers to increase stock, negative to decrease
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='reason'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Adjustment Reason</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select a reason' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(ADJUSTMENT_REASONS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <Textarea
                    placeholder='Provide details about this adjustment...'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Explain why this adjustment is being made
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Error Display */}
        {adjustmentMutation.error && (
          <Alert variant='destructive'>
            <AlertTriangle className='h-4 w-4' />
            <AlertDescription>
              {adjustmentMutation.error instanceof Error
                ? adjustmentMutation.error.message
                : 'Failed to adjust stock'}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className='flex justify-end gap-3'>
          {onCancel && (
            <Button type='button' variant='outline' onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type='submit'
            disabled={adjustmentMutation.isPending || !inventory}
          >
            {adjustmentMutation.isPending && (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            )}
            Submit Adjustment
          </Button>
        </div>
      </Form>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stock Adjustment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to make this adjustment?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingValues && inventory && (
            <div className='space-y-2 py-4'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Product:</span>
                <span className='font-medium'>{inventory.productName}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Current Stock:</span>
                <span className='font-medium'>{currentStock.toFixed(2)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Change:</span>
                <span
                  className={`font-medium ${
                    (pendingValues.quantity || 0) > 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {(pendingValues.quantity || 0) > 0 ? '+' : ''}
                  {pendingValues.quantity}
                </span>
              </div>
              <div className='flex justify-between border-t pt-2'>
                <span className='text-muted-foreground'>New Stock:</span>
                <span className='text-lg font-bold'>{newStock.toFixed(2)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Reason:</span>
                <span className='font-medium'>
                  {ADJUSTMENT_REASONS[pendingValues.reason as AdjustmentReason]}
                </span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm Adjustment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
