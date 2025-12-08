'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  materialTypeSchema,
  type MaterialType,
} from '@/lib/validations/material';
import { MATERIAL_TYPE_OPTIONS } from '@/lib/constants/material-types';

const materialFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  sku: z.string().max(100, 'SKU is too long').optional(),
  description: z.string().optional(),
  type: materialTypeSchema,
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  defaultCost: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost format')
    .optional()
    .or(z.literal('')),
  alertThreshold: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid threshold format')
    .optional()
    .or(z.literal('')),
  expiryTracking: z.boolean(),
  status: z.boolean(),
});

type MaterialFormValues = z.infer<typeof materialFormSchema>;

type Material = {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  type: MaterialType;
  categoryId: string | null;
  supplierId: string | null;
  unitOfMeasure: string;
  defaultCost: string | null;
  alertThreshold: string | null;
  expiryTracking: boolean;
  status: boolean;
};

type Category = {
  id: string;
  name: string;
};

type Supplier = {
  id: string;
  name: string;
};

type MaterialFormDialogProps = {
  material?: Material;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function MaterialFormDialog({
  material,
  open,
  onOpenChange,
  onSuccess,
}: MaterialFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: material?.name || '',
      sku: material?.sku || '',
      description: material?.description || '',
      type: material?.type || 'raw_materials',
      categoryId: material?.categoryId || '',
      supplierId: material?.supplierId || '',
      unitOfMeasure: material?.unitOfMeasure || '',
      defaultCost: material?.defaultCost || '',
      alertThreshold: material?.alertThreshold || '',
      expiryTracking: material?.expiryTracking ?? false,
      status: material?.status ?? true,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, suppliersRes] = await Promise.all([
          fetch('/api/material-categories?isActive=true'),
          fetch('/api/suppliers'),
        ]);

        if (categoriesRes.ok) {
          const catData = await categoriesRes.json();
          setCategories(catData.categories || []);
        }

        if (suppliersRes.ok) {
          const supData = await suppliersRes.json();
          setSuppliers(supData.suppliers || []);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (material) {
      form.reset({
        name: material.name,
        sku: material.sku || '',
        description: material.description || '',
        type: material.type,
        categoryId: material.categoryId || '',
        supplierId: material.supplierId || '',
        unitOfMeasure: material.unitOfMeasure,
        defaultCost: material.defaultCost || '',
        alertThreshold: material.alertThreshold || '',
        expiryTracking: material.expiryTracking,
        status: material.status,
      });
    } else {
      form.reset({
        name: '',
        sku: '',
        description: '',
        type: 'raw_materials',
        categoryId: '',
        supplierId: '',
        unitOfMeasure: '',
        defaultCost: '',
        alertThreshold: '',
        expiryTracking: false,
        status: true,
      });
    }
  }, [material, form]);

  const onSubmit = async (data: MaterialFormValues) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        defaultCost: data.defaultCost
          ? parseFloat(data.defaultCost)
          : undefined,
        alertThreshold: data.alertThreshold
          ? parseFloat(data.alertThreshold)
          : undefined,
        categoryId: data.categoryId || null,
        supplierId: data.supplierId || null,
      };

      const url = material ? `/api/materials/${material.id}` : '/api/materials';
      const method = material ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save material');
      }

      toast.success(
        `Material ${material ? 'updated' : 'created'} successfully`
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save material'
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {material ? 'Edit Material' : 'Add New Material'}
          </DialogTitle>
          <DialogDescription>
            {material
              ? 'Update the material details below'
              : 'Fill in the details to create a new material'}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder='Material name' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='sku'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder='Stock keeping unit' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder='Material description' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Material Type *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select type' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MATERIAL_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
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
              name='unitOfMeasure'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measure *</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., kg, liter, pieces' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='categoryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === 'none' ? '' : value)
                    }
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select category' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='none'>No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
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
              name='supplierId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select
                    onValueChange={(value) =>
                      field.onChange(value === 'none' ? '' : value)
                    }
                    value={field.value || 'none'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select supplier' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='none'>No supplier</SelectItem>
                      {suppliers.map((sup) => (
                        <SelectItem key={sup.id} value={sup.id}>
                          {sup.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='defaultCost'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Cost</FormLabel>
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

            <FormField
              control={form.control}
              name='alertThreshold'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Threshold</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      placeholder='0.00'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Low stock alert level</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='space-y-4'>
            <FormField
              control={form.control}
              name='expiryTracking'
              render={({ field }) => (
                <FormItem className='flex items-center space-x-2 space-y-0'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>Enable expiry tracking</FormLabel>
                    <FormDescription>Track batch expiry dates</FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem className='flex items-center space-x-2 space-y-0'>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>
                      Material is available for use
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {material ? 'Update' : 'Create'} Material
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
