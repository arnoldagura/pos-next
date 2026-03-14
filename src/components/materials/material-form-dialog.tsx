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
import { materialTypeSchema } from '@/lib/validations/material';
import { MATERIAL_TYPE_OPTIONS } from '@/lib/constants/material-types';
import { Category, MaterialForm } from '@/lib/types';

const materialFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().optional(),
  type: materialTypeSchema,
  categoryId: z.string().optional(),
  status: z.boolean(),
});

type MaterialFormValues = z.infer<typeof materialFormSchema>;

type MaterialFormDialogProps = {
  material?: MaterialForm;
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
  const [categories, setCategories] = useState<Array<Pick<Category, 'id' | 'name'>>>([]);

  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: {
      name: material?.name || '',
      description: material?.description || '',
      type: material?.type || 'raw_materials',
      categoryId: material?.categoryId || '',
      status: material?.status ?? true,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const categoriesRes = await fetch('/api/material-categories?isActive=true');

        if (categoriesRes.ok) {
          const catData = await categoriesRes.json();
          setCategories(catData.categories || []);
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
        description: material.description || '',
        type: material.type,
        categoryId: material.categoryId || '',

        status: material.status,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        type: 'raw_materials',
        categoryId: '',
        status: true,
      });
    }
  }, [material, form]);

  const onSubmit = async (data: MaterialFormValues) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        categoryId: data.categoryId || null,
      };
      console.log('payload', payload);
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

      toast.success(`Material ${material ? 'updated' : 'created'} successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save material');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{material ? 'Edit Material' : 'Add New Material'}</DialogTitle>
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
              name='categoryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
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
          </div>
          <div className='space-y-4'>
            <FormField
              control={form.control}
              name='status'
              render={({ field }) => (
                <FormItem className='flex items-center space-x-2 space-y-0'>
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className='space-y-1 leading-none'>
                    <FormLabel>Active</FormLabel>
                    <FormDescription>Material is available for use</FormDescription>
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
