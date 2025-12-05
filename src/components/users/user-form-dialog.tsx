'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { toast } from 'sonner';

const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  emailVerified: z.boolean(),
});

type UserFormValues = z.infer<typeof userFormSchema>;

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

type UserFormDialogProps = {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function UserFormDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: UserFormDialogProps) {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
    },
  });

  const onSubmit = async (data: UserFormValues) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update user');

      toast.success('User updated successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to update user');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information. Click save when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div>
            <label className='text-sm font-medium'>
              Name <span className='text-red-500'>*</span>
            </label>
            <Input {...register('name')} placeholder='John Doe' />
            {errors.name && (
              <p className='text-sm text-red-500 mt-1'>{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className='text-sm font-medium'>
              Email <span className='text-red-500'>*</span>
            </label>
            <Input
              {...register('email')}
              type='email'
              placeholder='john@example.com'
            />
            {errors.email && (
              <p className='text-sm text-red-500 mt-1'>
                {errors.email.message}
              </p>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <input
              {...register('emailVerified')}
              type='checkbox'
              id='emailVerified'
              className='h-4 w-4 rounded border-gray-300'
            />
            <label htmlFor='emailVerified' className='text-sm font-medium'>
              Email Verified
            </label>
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
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
