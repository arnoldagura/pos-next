'use client';

import { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { createLocationSchema } from '@/lib/validations/location';

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type LocationFormDialogProps = {
  location?: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function LocationFormDialog({
  location,
  open,
  onOpenChange,
  onSuccess,
}: LocationFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm({
    resolver: zodResolver(createLocationSchema),
    defaultValues: {
      name: location?.name || '',
      address: location?.address || '',
      city: location?.city || '',
      state: location?.state || '',
      zipCode: location?.zipCode || '',
      country: location?.country || '',
      phone: location?.phone || '',
      email: location?.email || '',
      isActive: location?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (location) {
      form.reset({
        name: location.name,
        address: location.address,
        city: location.city || '',
        state: location.state || '',
        zipCode: location.zipCode || '',
        country: location.country || '',
        phone: location.phone || '',
        email: location.email || '',
        isActive: location.isActive,
      });
    } else {
      form.reset({
        name: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        phone: '',
        email: '',
        isActive: true,
      });
    }
    setIsDirty(false);
  }, [location, form, open]);

  useEffect(() => {
    const subscription = form.watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      setLoading(true);

      const url = location
        ? `/api/locations/${location.id}`
        : '/api/locations';
      const method = location ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save location');
      }

      toast.success(
        location
          ? 'Location updated successfully'
          : 'Location created successfully'
      );
      setIsDirty(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save location'
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
            {location ? 'Edit Location' : 'Create Location'}
          </DialogTitle>
          <DialogDescription>
            {location
              ? 'Update location information'
              : 'Add a new location for inventory management'}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
            {/* Name */}
            <FormField
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Name *</FormLabel>
                <FormControl>
                  <Input placeholder='e.g., Main Warehouse' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Address */}
          <FormField
            name='address'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address *</FormLabel>
                <FormControl>
                  <Input placeholder='Street address' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* City, State, Zip - Grid Layout */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <FormField
              name='city'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder='City' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name='state'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State/Province</FormLabel>
                  <FormControl>
                    <Input placeholder='State' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name='zipCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ZIP/Postal Code</FormLabel>
                  <FormControl>
                    <Input placeholder='ZIP Code' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Country */}
          <FormField
            name='country'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder='Country' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone and Email - Grid Layout */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <FormField
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder='+1 (555) 123-4567' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='location@example.com'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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
                    Enable this location for inventory operations
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
              {location ? 'Update' : 'Create'} Location
            </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
