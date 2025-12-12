'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Shuffle } from 'lucide-react';
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
import { generateSlug } from '@/lib/validations/category';
import { Category, CategoryFormValues } from '@/lib/types';

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    )
    .optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
  displayOrder: z.number().int().min(0),
  isActive: z.boolean(),
});

type CategoryFormDialogProps = {
  category?: Category;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CategoryFormDialog({
  category,
  open,
  onOpenChange,
  onSuccess,
}: CategoryFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      parentId: category?.parentId || 'none',
      displayOrder: category?.displayOrder || 0,
      isActive: category?.isActive ?? true,
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories?isActive=true');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();

        const filteredCategories = category
          ? data.categories.filter((cat: Category) => cat.id !== category.id)
          : data.categories;
        setCategories(filteredCategories || []);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open, category]);

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parentId: category.parentId || 'none',
        displayOrder: category.displayOrder,
        isActive: category.isActive,
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        description: '',
        parentId: 'none',
        displayOrder: 0,
        isActive: true,
      });
    }
    setIsDirty(false);
  }, [category, form, open]);

  useEffect(() => {
    const subscription = form.watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [form]);

  const generateSlugFromName = () => {
    const name = form.getValues('name');
    if (!name) {
      toast.error('Please enter a category name first');
      return;
    }
    const slug = generateSlug(name);
    form.setValue('slug', slug);
    setIsDirty(true);
  };

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        parentId:
          data.parentId && data.parentId !== 'none' ? data.parentId : null,
      };

      const url = category
        ? `/api/categories/${category.id}`
        : '/api/categories';
      const method = category ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save category');
      }

      toast.success(
        category
          ? 'Category updated successfully'
          : 'Category created successfully'
      );
      setIsDirty(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save category'
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmed = confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogDescription>
            {category
              ? 'Update category information'
              : 'Add a new category for organizing products'}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          {/* Name */}
          <FormField
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Name *</FormLabel>
                <FormControl>
                  <Input placeholder='e.g., Beverages' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Slug */}
          <FormField
            name='slug'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug</FormLabel>
                <div className='flex gap-2'>
                  <FormControl>
                    <Input placeholder='e.g., beverages' {...field} />
                  </FormControl>
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    onClick={generateSlugFromName}
                    title='Generate slug from name'
                  >
                    <Shuffle className='h-4 w-4' />
                  </Button>
                </div>
                <FormDescription>
                  URL-friendly identifier (auto-generated if empty)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Parent Category */}
          <FormField
            name='parentId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parent Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='None (top-level category)' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='none'>
                      None (top-level category)
                    </SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Create a subcategory by selecting a parent
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Display Order */}
          <FormField
            name='displayOrder'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Order</FormLabel>
                <FormControl>
                  <Input
                    type='number'
                    placeholder='0'
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value) || 0)
                    }
                  />
                </FormControl>
                <FormDescription>Lower numbers appear first</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Description */}
          <FormField
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <textarea
                    placeholder='Category description...'
                    className='w-full min-h-[80px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Active Status */}
          <FormField
            name='isActive'
            render={({ field }) => (
              <FormItem className='flex flex-row items-start space-x-3 space-y-0'>
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className='space-y-1 leading-none'>
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Show this category in product selection
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {category ? 'Update' : 'Create'} Category
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
