'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  createOrganizationSchema,
  type CreateOrganizationInput,
  type SubscriptionTier,
} from '@/lib/validations/organization';
import { Organization } from '@/lib/types/organization';

interface OrganizationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization: Organization | null;
  onSuccess: () => void;
}

export function OrganizationFormDialog({
  open,
  onOpenChange,
  organization,
  onSuccess,
}: OrganizationFormDialogProps) {
  const isEditing = !!organization;

  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      subdomain: '',
      domain: '',
      subscriptionTier: 'starter',
      maxUsers: 5,
      maxLocations: 1,
      billingEmail: '',
      contactName: '',
      contactPhone: '',
      address: '',
      city: '',
      country: '',
      taxId: '',
      // settings: {},
    },
  });

  useEffect(() => {
    if (organization) {
      form.reset({
        name: organization.name,
        slug: organization.slug,
        subdomain: organization.subdomain || '',
        domain: organization.domain || '',
        subscriptionTier: organization.subscriptionTier as SubscriptionTier,
        maxUsers: organization.maxUsers,
        maxLocations: organization.maxLocations,
        billingEmail: organization.billingEmail || '',
        contactName: organization.contactName || '',
        contactPhone: organization.contactPhone || '',
      });
    } else {
      form.reset({
        name: '',
        slug: '',
        subdomain: '',
        domain: '',
        subscriptionTier: 'starter',
        maxUsers: 5,
        maxLocations: 1,
        billingEmail: '',
        contactName: '',
        contactPhone: '',
        address: '',
        city: '',
        country: '',
        taxId: '',
      });
    }
  }, [organization, form]);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    form.setValue('name', value);
    if (!isEditing) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      form.setValue('slug', slug);
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: CreateOrganizationInput) => {
      const url = isEditing
        ? `/api/organizations/${organization.id}`
        : '/api/organizations';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save organization');
      }

      return res.json();
    },
    onSuccess: () => {
      toast.success(
        isEditing
          ? 'Organization updated successfully'
          : 'Organization created successfully'
      );
      onSuccess();
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: CreateOrganizationInput) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Organization' : 'Create New Organization'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the organization details below'
              : 'Fill in the details to create a new organization'}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-4'>
          {/* Basic Information */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium'>Basic Information</h3>

            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder='Acme Corp'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='slug'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='acme-corp' />
                  </FormControl>
                  <FormDescription>
                    URL-friendly identifier (lowercase, hyphens only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='subdomain'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subdomain</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='acme' />
                    </FormControl>
                    <FormDescription>acme.yourdomain.com</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='domain'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Domain</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='pos.acme.com' />
                    </FormControl>
                    <FormDescription>Optional custom domain</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Subscription Details */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium'>Subscription</h3>

            <FormField
              control={form.control}
              name='subscriptionTier'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Tier *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder='Select a tier' />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value='starter'>Starter</SelectItem>
                      <SelectItem value='professional'>Professional</SelectItem>
                      <SelectItem value='enterprise'>Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='maxUsers'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Users *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='number'
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='maxLocations'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Locations *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='number'
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className='space-y-4'>
            <h3 className='text-sm font-medium'>Contact Information</h3>

            <FormField
              control={form.control}
              name='contactName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder='John Doe' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='contactPhone'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder='+1234567890' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='billingEmail'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type='email'
                        placeholder='billing@acme.com'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className='flex justify-end gap-3 pt-4 border-t'>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={mutation.isPending}>
              {mutation.isPending
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                ? 'Update Organization'
                : 'Create Organization'}
            </Button>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
