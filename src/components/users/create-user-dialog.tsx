'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormFieldWrapper } from '../forms/form-wrapper';
import { PasswordInput } from '../ui/password-input';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Role is required'),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

type Role = {
  id: string;
  name: string;
};

type CreateUserDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function CreateUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      roleId: '',
    },
  });

  const selectedRoleId = watch('roleId');

  useEffect(() => {
    if (open) {
      fetchRoles();
      reset();
    }
  }, [open, reset]);

  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await fetch('/api/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');

      const data = await response.json();
      setRoles(data.roles || []);
    } catch (error) {
      toast.error('Failed to load roles');
      console.error(error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const onSubmit = async (data: CreateUserFormValues) => {
    try {
      setLoading(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      toast.success(
        result.message || 'User created and added to organization successfully'
      );
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create user'
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to your organization. They will be able to log in
            with the provided credentials.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div>
            <label className='text-sm font-medium'>
              Name <span className='text-red-500'>*</span>
            </label>
            <Input
              {...register('name')}
              placeholder='John Doe'
              disabled={loading}
              autoComplete='name'
            />
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
              disabled={loading}
              autoComplete='email'
            />
            {errors.email && (
              <p className='text-sm text-red-500 mt-1'>
                {errors.email.message}
              </p>
            )}
          </div>

          <FormFieldWrapper
            label='Password'
            error={errors.password?.message}
            required
          >
            <PasswordInput
              {...register('password')}
              placeholder='••••••••'
              autoComplete='new-password'
              aria-invalid={errors.password ? 'true' : 'false'}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
          </FormFieldWrapper>

          <div>
            <label className='text-sm font-medium'>
              Role <span className='text-red-500'>*</span>
            </label>
            <Select
              value={selectedRoleId}
              onValueChange={(value) => setValue('roleId', value)}
              disabled={loading || loadingRoles}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a role' />
              </SelectTrigger>
              <SelectContent>
                {loadingRoles ? (
                  <SelectItem value='loading' disabled>
                    Loading roles...
                  </SelectItem>
                ) : roles.length === 0 ? (
                  <SelectItem value='none' disabled>
                    No roles available
                  </SelectItem>
                ) : (
                  roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.roleId && (
              <p className='text-sm text-red-500 mt-1'>
                {errors.roleId.message}
              </p>
            )}
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
            <Button type='submit' disabled={loading || loadingRoles}>
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
