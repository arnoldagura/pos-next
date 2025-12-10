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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const formSchema = z.object({
  actualQuantity: z.string().min(1, 'Actual quantity is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface CompleteProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  plannedQuantity: number;
  unitOfMeasure: string;
  onSuccess: () => void;
}

export default function CompleteProductionDialog({
  open,
  onOpenChange,
  orderId,
  plannedQuantity,
  unitOfMeasure,
  onSuccess,
}: CompleteProductionDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      actualQuantity: plannedQuantity.toString(),
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);

      const response = await fetch(
        `/api/production-orders/${orderId}/complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualQuantity: parseFloat(values.actualQuantity),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete production');
      }

      toast.success('Production completed successfully');
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error completing production:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to complete production'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Complete Production</DialogTitle>
          <DialogDescription>
            Enter the actual quantity produced. This will add the output to
            inventory and mark the order as completed.
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <FormField
            control={form.control}
            name='actualQuantity'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Actual Quantity Produced *</FormLabel>
                <FormControl>
                  <div className='flex items-center gap-2'>
                    <Input
                      type='number'
                      step='0.01'
                      min='0.01'
                      placeholder='Enter quantity'
                      {...field}
                    />
                    <span className='text-sm text-muted-foreground min-w-fit'>
                      {unitOfMeasure}
                    </span>
                  </div>
                </FormControl>
                <FormDescription>
                  Planned quantity was {plannedQuantity} {unitOfMeasure}
                  {field.value && (
                    <>
                      {' • '}
                      Variance:{' '}
                      {(
                        ((parseFloat(field.value) - plannedQuantity) /
                          plannedQuantity) *
                        100
                      ).toFixed(1)}
                      %
                    </>
                  )}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='rounded-lg border p-4 bg-muted/50'>
            <p className='text-sm text-muted-foreground'>
              <strong>What happens next:</strong>
            </p>
            <ul className='text-sm text-muted-foreground list-disc list-inside mt-2 space-y-1'>
              <li>Order status will change to &quot;Completed&quot;</li>
              <li>Output quantity will be added to inventory</li>
              <li>You can then finalize costs (labor & overhead)</li>
            </ul>
          </div>

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
              Complete Production
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
