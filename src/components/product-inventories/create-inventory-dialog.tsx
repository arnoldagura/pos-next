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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Product, Location } from '@/lib/types';

const formSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  locationId: z.string().min(1, 'Location is required'),
  variantName: z.string().optional(),
  barcode: z.string().optional(),
  unitPrice: z.string().min(1, 'Unit price is required'),
  costPrice: z.string().optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  taxRate: z.number().min(0, 'tax rate must be positive'),
  alertThreshold: z.number().positive('alert threshold must be positive'),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function CreateInventoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInventoryDialogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productId: '',
      locationId: '',
      variantName: '',
      barcode: '',
      unitPrice: '',
      costPrice: '',
      unitOfMeasure: '',
      taxRate: 0,
      alertThreshold: 10,
    },
  });

  useEffect(() => {
    if (open) {
      fetchProducts();
      fetchLocations();
    }
  }, [open]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/products?status=active&limit=100');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations?limit=100');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setSubmitting(true);

      const response = await fetch('/api/product-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: values.productId,
          locationId: values.locationId,
          variantName: values.variantName || undefined,
          barcode: values.barcode || undefined,
          unitPrice: parseFloat(values.unitPrice),
          costPrice: values.costPrice
            ? parseFloat(values.costPrice)
            : undefined,
          unitOfMeasure: values.unitOfMeasure,
          taxRate: values.taxRate ? values.taxRate : 0,
          alertThreshold: values.alertThreshold ? values.alertThreshold : 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create inventory');
      }

      toast.success('Inventory created successfully');
      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating inventory:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create inventory'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[600px] max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Add Product to Inventory</DialogTitle>
          <DialogDescription>
            Set up inventory tracking for a product at a specific location. This
            creates a unique inventory item with its own pricing and unit of
            measure.
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          <FormField
            control={form.control}
            name='productId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product *</FormLabel>
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select product' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {loading ? (
                      <div className='p-2 text-center text-sm text-muted-foreground'>
                        Loading products...
                      </div>
                    ) : products.length === 0 ? (
                      <div className='p-2 text-center text-sm text-muted-foreground'>
                        No products found
                      </div>
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>Base product template</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='locationId'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder='Select location' />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locations.length === 0 ? (
                      <div className='p-2 text-center text-sm text-muted-foreground'>
                        No locations found
                      </div>
                    ) : (
                      locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Location where this inventory item will be tracked
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='variantName'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Variant Name (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder='e.g., Standard, Large, Premium'
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Distinguishes different variants of the same product
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='barcode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barcode</FormLabel>
                <FormControl>
                  <Input placeholder='Enter barcode' {...field} />
                </FormControl>
                <FormDescription>
                  Optional barcode for this inventory item
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='unitPrice'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price (Selling) *</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      placeholder='0.00'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Price per unit for selling</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='costPrice'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cost Price</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      placeholder='0.00'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Cost per unit</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className='grid grid-cols-2 gap-4'>
            <FormField
              control={form.control}
              name='unitOfMeasure'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit of Measure *</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., slice, whole, kg' {...field} />
                  </FormControl>
                  <FormDescription>Unit for this inventory</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='taxRate'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      step='0.01'
                      min='0'
                      max='100'
                      placeholder='0'
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Tax percentage</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
                    min='0'
                    placeholder='10'
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
              Add to Inventory
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
