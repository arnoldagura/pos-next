'use client';

import { useState, useEffect } from 'react';
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

const formSchema = z.object({
  alertThreshold: z.string().min(1, 'Alert threshold is required'),
  unitOfMeasure: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InventoryRecord {
  id: string;
  alertThreshold: string;
  unitOfMeasure: string | null;
  productName: string;
  locationName: string;
}

interface EditInventorySettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventory: InventoryRecord;
  onSuccess: () => void;
}

export default function EditInventorySettingsDialog({
  open,
  onOpenChange,
  inventory,
  onSuccess,
}: EditInventorySettingsDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      alertThreshold: inventory.alertThreshold,
      unitOfMeasure: inventory.unitOfMeasure || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        alertThreshold: inventory.alertThreshold,
        unitOfMeasure: inventory.unitOfMeasure || '',
      });
    }
  }, [open, inventory, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);

      const response = await fetch(`/api/product-inventories/${inventory.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertThreshold: parseFloat(values.alertThreshold),
          unitOfMeasure: values.unitOfMeasure || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      toast.success('Settings updated successfully');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update settings'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Edit Inventory Settings</DialogTitle>
          <DialogDescription>
            Update settings for {inventory.productName} at{' '}
            {inventory.locationName}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <FormField
            control={form.control}
            name='alertThreshold'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alert Threshold *</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    step='0.01'
                    min='0'
                    placeholder='Enter threshold quantity'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Get notified when stock falls below this level
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='unitOfMeasure'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit of Measure (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder='e.g., units, boxes, kg' {...field} />
                </FormControl>
                <FormDescription>
                  Specify the unit of measure for this inventory
                </FormDescription>
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
              Save Changes
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
