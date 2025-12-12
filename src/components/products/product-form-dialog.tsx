'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
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

const productFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.boolean(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

type Product = {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  image: string | null;
  status: boolean;
};

type Category = {
  id: string;
  name: string;
};

type ProductFormDialogProps = {
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function ProductFormDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: ProductFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.image || null
  );
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      categoryId: product?.categoryId || '',
      status: product?.status ?? true,
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories?isActive=true');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || '',
        categoryId: product.categoryId || '',
        status: product.status,
      });
      setImagePreview(product.image);
    } else {
      form.reset({
        name: '',
        description: '',
        categoryId: '',
        status: true,
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsDirty(false);
  }, [product, form, open]);

  // Track form changes
  useEffect(() => {
    const subscription = form.watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setIsDirty(true);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsDirty(true);
  };

  const uploadImage = async (productId: string): Promise<void> => {
    if (!imageFile) return;

    const formData = new FormData();
    formData.append('image', imageFile);

    const response = await fetch(`/api/products/${productId}/image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
  };

  const onSubmit = async (data: ProductFormValues) => {
    try {
      setLoading(true);

      const payload = {
        ...data,
        categoryId: data.categoryId || null,
      };

      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save product');
      }

      const savedProduct = await response.json();

      // Upload image if there's a new one
      if (imageFile) {
        await uploadImage(savedProduct.id);
      }

      toast.success(
        product
          ? 'Product updated successfully'
          : 'Product created successfully'
      );
      setIsDirty(false);

      if (saveAndAddAnother && !product) {
        form.reset({
          name: '',
          description: '',
          categoryId: data.categoryId,
          status: true,
        });
        setImageFile(null);
        setImagePreview(null);
        setIsDirty(false);
        onSuccess();
      } else {
        onOpenChange(false);
        onSuccess();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save product'
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
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {product ? 'Edit Product' : 'Create Product'}
          </DialogTitle>
          <DialogDescription>
            {product
              ? 'Update product information and pricing'
              : 'Add a new product to your inventory'}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          {/* Image Upload */}
          <div className='space-y-2'>
            <FormLabel>Product Image</FormLabel>
            <div className='flex items-start gap-4'>
              {imagePreview ? (
                <div className='relative'>
                  <Image
                    src={imagePreview}
                    alt='Product preview'
                    width={120}
                    height={120}
                    className='rounded-lg object-cover border'
                  />
                  <button
                    type='button'
                    onClick={handleRemoveImage}
                    className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600'
                  >
                    <X className='h-4 w-4' />
                  </button>
                </div>
              ) : (
                <div className='w-[120px] h-[120px] border-2 border-dashed rounded-lg flex items-center justify-center text-gray-400'>
                  <Upload className='h-8 w-8' />
                </div>
              )}
              <div className='flex-1 space-y-2'>
                <Input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handleImageChange}
                  className='cursor-pointer'
                />
                <p className='text-xs text-gray-500'>
                  PNG, JPG, WebP up to 5MB
                </p>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            {/* Name */}
            <FormField
              name='name'
              render={({ field }) => (
                <FormItem className='col-span-2'>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='e.g., Premium Coffee Beans'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              name='categoryId'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select category' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

          {/* Description */}
          <FormField
            name='description'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <textarea
                    placeholder='Product description...'
                    className='w-full min-h-[100px] px-3 py-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Status */}
          <FormField
            name='status'
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
                    This product will be available for sale
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <DialogFooter className='gap-2'>
            {!product && (
              <div className='flex items-center space-x-2 mr-auto'>
                <Checkbox
                  id='saveAndAddAnother'
                  checked={saveAndAddAnother}
                  onCheckedChange={(checked) =>
                    setSaveAndAddAnother(checked as boolean)
                  }
                />
                <label
                  htmlFor='saveAndAddAnother'
                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                >
                  Save and add another
                </label>
              </div>
            )}
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
              {product ? 'Update' : 'Create'} Product
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
