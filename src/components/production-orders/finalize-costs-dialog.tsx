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
  laborCost: z.string().min(1, 'Labor cost is required'),
  overheadCost: z.string().min(1, 'Overhead cost is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface FinalizeCostsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  materialCost: number;
  onSuccess: () => void;
}

export default function FinalizeCostsDialog({
  open,
  onOpenChange,
  orderId,
  materialCost,
  onSuccess,
}: FinalizeCostsDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      laborCost: '0',
      overheadCost: '0',
    },
  });

  const laborCost = parseFloat(form.watch('laborCost') || '0');
  const overheadCost = parseFloat(form.watch('overheadCost') || '0');
  const totalCost = materialCost + laborCost + overheadCost;

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);

      const response = await fetch(
        `/api/production-orders/${orderId}/finalize`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            laborCost: parseFloat(values.laborCost),
            overheadCost: parseFloat(values.overheadCost),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to finalize costs');
      }

      toast.success('Costs finalized successfully');
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error finalizing costs:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to finalize costs'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Finalize Production Costs</DialogTitle>
          <DialogDescription>
            Add labor and overhead costs to calculate the total production cost.
            The system will suggest a selling price based on these costs.
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <div className='rounded-lg border p-4 bg-muted/50'>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Material Cost:</span>
                <span className='font-medium'>${materialCost.toFixed(2)}</span>
              </div>
              {laborCost > 0 && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Labor Cost:</span>
                  <span className='font-medium'>${laborCost.toFixed(2)}</span>
                </div>
              )}
              {overheadCost > 0 && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Overhead Cost:</span>
                  <span className='font-medium'>
                    ${overheadCost.toFixed(2)}
                  </span>
                </div>
              )}
              <div className='flex justify-between pt-2 border-t'>
                <span className='font-semibold'>Total Cost:</span>
                <span className='font-bold'>${totalCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name='laborCost'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Labor Cost *</FormLabel>
                <FormControl>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm'>$</span>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      placeholder='0.00'
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Total labor cost for this production run
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='overheadCost'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Overhead Cost *</FormLabel>
                <FormControl>
                  <div className='flex items-center gap-2'>
                    <span className='text-sm'>$</span>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      placeholder='0.00'
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormDescription>
                  Facility, utilities, equipment costs, etc.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='rounded-lg border p-4 bg-blue-50 border-blue-200'>
            <p className='text-sm text-blue-900'>
              <strong>What happens next:</strong>
            </p>
            <ul className='text-sm text-blue-800 list-disc list-inside mt-2 space-y-1'>
              <li>Total cost will be calculated</li>
              <li>Unit cost will be computed</li>
              <li>Suggested selling price (30% margin) will be calculated</li>
              <li>Order status will change to &quot;Costing Done&quot;</li>
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
              Finalize Costs
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
