'use client';

import { useForm, useFieldArray } from 'react-hook-form';
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
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Package } from 'lucide-react';
import { useState, useEffect } from 'react';

const materialItemSchema = z.object({
  id: z.string(),
  materialName: z.string(),
  quantity: z.number(),
  unitOfMeasure: z.string(),
  unitCost: z.string(),
  totalCost: z.string(),
});

const formSchema = z.object({
  materials: z.array(materialItemSchema),
  laborCost: z.string().min(1, 'Labor cost is required'),
  overheadCost: z.string().min(1, 'Overhead cost is required'),
});

type FormValues = z.infer<typeof formSchema>;

interface MaterialItem {
  id: string;
  materialInventoryId: string;
  plannedQuantity: string;
  actualQuantity: string | null;
  unitOfMeasure: string;
  unitCost: string | null;
  totalCost: string | null;
  materialInventory: {
    id: string;
    variantName: string | null;
    material: {
      id: string;
      name: string;
    };
  };
}

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
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      materials: [],
      laborCost: '0',
      overheadCost: '0',
    },
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: 'materials',
  });

  const materials = form.watch('materials') || [];
  const calculatedMaterialCost = materials.reduce(
    (sum, m) => sum + parseFloat(m.totalCost || '0'),
    0
  );
  const laborCost = parseFloat(form.watch('laborCost') || '0');
  const overheadCost = parseFloat(form.watch('overheadCost') || '0');
  const totalCost =
    calculatedMaterialCost + laborCost + overheadCost || materialCost;

  // Fetch materials when dialog opens
  useEffect(() => {
    if (open && orderId) {
      fetchMaterials();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/production-orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order details');

      const data = await response.json();
      const materialItems = data.materials.map((m: MaterialItem) => ({
        id: m.id,
        materialName: m.materialInventory.material.name,
        quantity: Number(m.actualQuantity || m.plannedQuantity),
        unitOfMeasure: m.unitOfMeasure,
        unitCost: m.unitCost || '0',
        totalCost: m.totalCost || '0',
      }));

      form.setValue('materials', materialItems);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load material costs');
    } finally {
      setLoading(false);
    }
  };

  const handleUnitCostChange = (index: number, newUnitCost: string) => {
    const material = materials[index];
    const unitCost = parseFloat(newUnitCost || '0');
    const totalCost = (material.quantity * unitCost).toFixed(2);

    update(index, {
      ...material,
      unitCost: newUnitCost,
      totalCost,
    });
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);

      // First update material costs if changed
      const materialUpdates = values.materials.map((m) => ({
        id: m.id,
        unitCost: parseFloat(m.unitCost),
        totalCost: parseFloat(m.totalCost),
      }));

      const updateMaterialsResponse = await fetch(
        `/api/production-orders/${orderId}/update-material-costs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ materials: materialUpdates }),
        }
      );

      if (!updateMaterialsResponse.ok) {
        throw new Error('Failed to update material costs');
      }

      // Then finalize costs
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
      <DialogContent className='sm:max-w-[700px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Finalize Production Costs</DialogTitle>
          <DialogDescription>
            Review and adjust material costs, add labor and overhead costs to
            calculate the total production cost.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <Form form={form} onSubmit={onSubmit} className='space-y-4'>
            {fields.length > 0 && (
              <div className='space-y-3'>
                <div className='flex items-center gap-2 text-sm font-medium'>
                  <Package className='h-4 w-4' />
                  <span>Material Costs</span>
                </div>

                {fields.map((field, index) => {
                  const material = materials[index];
                  return (
                    <Card
                      key={field.id}
                      className='border-l-4 border-l-blue-200'
                    >
                      <CardContent className='pt-4 pb-4'>
                        <div className='space-y-3'>
                          <div className='flex items-center justify-between'>
                            <div>
                              <div className='font-medium text-sm'>
                                {material.materialName}
                              </div>
                              <div className='text-xs text-muted-foreground'>
                                Quantity: {material.quantity}{' '}
                                {material.unitOfMeasure}
                              </div>
                            </div>
                          </div>

                          <div className='grid grid-cols-2 gap-3'>
                            <div>
                              <label className='text-xs text-muted-foreground'>
                                Unit Cost ($)
                              </label>
                              <Input
                                type='number'
                                step='0.01'
                                min='0'
                                value={material.unitCost}
                                onChange={(e) =>
                                  handleUnitCostChange(index, e.target.value)
                                }
                                className='mt-1'
                              />
                            </div>
                            <div>
                              <label className='text-xs text-muted-foreground'>
                                Total Cost ($)
                              </label>
                              <Input
                                type='text'
                                value={parseFloat(material.totalCost).toFixed(
                                  2
                                )}
                                disabled
                                className='mt-1 bg-muted'
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

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

            <div className='rounded-lg border p-4 bg-muted/50'>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Material Cost:</span>
                  <span className='font-medium'>
                    ${calculatedMaterialCost.toFixed(2)}
                  </span>
                </div>
                {laborCost > 0 && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Labor Cost:</span>
                    <span className='font-medium'>${laborCost.toFixed(2)}</span>
                  </div>
                )}
                {overheadCost > 0 && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>
                      Overhead Cost:
                    </span>
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
                {submitting && (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                )}
                Finalize Costs
              </Button>
            </DialogFooter>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
