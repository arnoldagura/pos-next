'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Shield, Check } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  Role,
  Permission,
  createRoleSchema,
  CreateRoleInput,
  PermissionsByResource,
} from '@/lib/types/rbac';

type RoleFormDialogProps = {
  role?: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function RoleFormDialog({ role, open, onOpenChange, onSuccess }: RoleFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [permissionsByResource, setPermissionsByResource] = useState<PermissionsByResource>({});
  const [isDirty, setIsDirty] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const form = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissionIds: [],
    },
  });

  useEffect(() => {
    if (role) {
      form.reset({
        name: role?.name || '',
        description: role?.description || '',
        permissionIds: [],
      });
    } else {
      form.reset({
        name: '',
        description: '',
        permissionIds: [],
      });
    }
  }, [role, form]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const permResponse = await fetch('/api/permissions');
        if (!permResponse.ok) throw new Error('Failed to fetch permissions');
        const permData = await permResponse.json();

        const grouped = (permData.permissions || []).reduce(
          (acc: PermissionsByResource, perm: Permission) => {
            if (!acc[perm.resource]) {
              acc[perm.resource] = [];
            }
            acc[perm.resource].push(perm);
            return acc;
          },
          {}
        );
        setPermissionsByResource(grouped);

        // If editing, fetch role's current permissions
        if (role) {
          const roleResponse = await fetch(`/api/roles/${role.id}`);
          if (!roleResponse.ok) throw new Error('Failed to fetch role details');
          const roleData = await roleResponse.json();

          const permIds = new Set<string>(roleData.permissions?.map((p: Permission) => p.id) || []);
          setSelectedPermissions(permIds);
          form.setValue('permissionIds', Array.from(permIds));
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        toast.error('Failed to load permissions');
      }
    };

    if (open) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role]);

  useEffect(() => {
    if (role) {
      form.reset({
        name: role.name,
        description: role.description || '',
        permissionIds: Array.from(selectedPermissions),
      });
    } else {
      form.reset({
        name: '',
        description: '',
        permissionIds: [],
      });
      setSelectedPermissions(new Set());
    }
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, open]);

  useEffect(() => {
    const subscription = form.watch(() => setIsDirty(true));
    return () => subscription.unsubscribe();
  }, [form]);

  const togglePermission = (permissionId: string) => {
    const newSelected = new Set<string>(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
    form.setValue('permissionIds', Array.from(newSelected));
    setIsDirty(true);
  };

  const toggleAllResourcePermissions = (resource: string) => {
    const resourcePerms = permissionsByResource[resource] || [];
    const allSelected = resourcePerms.every((p) => selectedPermissions.has(p.id));

    const newSelected = new Set<string>(selectedPermissions);
    resourcePerms.forEach((p) => {
      if (allSelected) {
        newSelected.delete(p.id);
      } else {
        newSelected.add(p.id);
      }
    });

    setSelectedPermissions(newSelected);
    form.setValue('permissionIds', Array.from(newSelected));
    setIsDirty(true);
  };

  const onSubmit = async (data: CreateRoleInput) => {
    try {
      setLoading(true);

      const url = role ? `/api/roles/${role.id}` : '/api/roles';
      const method = role ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save role');
      }

      toast.success(role ? 'Role updated successfully' : 'Role created successfully');
      setIsDirty(false);
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save role');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      const confirmed = confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onOpenChange(false);
  };

  const getResourceLabel = (resource: string) => {
    return resource
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='max-w-3xl max-h-[90vh]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            {role ? 'Edit Role' : 'Create Role'}
          </DialogTitle>
          <DialogDescription>
            {role
              ? 'Update role information and permissions'
              : 'Create a new role with specific permissions'}
          </DialogDescription>
        </DialogHeader>

        <Form form={form} onSubmit={onSubmit} className='space-y-6'>
          <div className='space-y-4'>
            {/* Name */}
            <FormField
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name *</FormLabel>
                  <FormControl>
                    <Input placeholder='e.g., store_manager' {...field} disabled={role?.isGlobal} />
                  </FormControl>
                  <FormDescription>Use lowercase letters and underscores only</FormDescription>
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
                    <Textarea
                      placeholder='Describe the responsibilities of this role...'
                      className='resize-none'
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Permissions Section */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <FormLabel>Permissions</FormLabel>
                <Badge variant='secondary'>{selectedPermissions.size} selected</Badge>
              </div>

              <ScrollArea className='h-[300px] rounded-md border p-4'>
                <div className='space-y-4'>
                  {Object.entries(permissionsByResource).map(([resource, perms]) => {
                    const allSelected = perms.every((p) => selectedPermissions.has(p.id));
                    const someSelected = perms.some((p) => selectedPermissions.has(p.id));

                    return (
                      <div key={resource} className='space-y-2'>
                        <div className='flex items-center gap-2'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-6 px-2 font-semibold'
                            onClick={() => toggleAllResourcePermissions(resource)}
                          >
                            {allSelected ? (
                              <Check className='h-4 w-4 mr-1' />
                            ) : someSelected ? (
                              <div className='h-4 w-4 mr-1 rounded border-2 border-primary bg-primary/50' />
                            ) : null}
                            {getResourceLabel(resource)}
                          </Button>
                          <Badge variant='outline'>{perms.length}</Badge>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 gap-2 ml-6'>
                          {perms.map((perm) => (
                            <div key={perm.id} className='flex items-start space-x-2'>
                              <Checkbox
                                id={perm.id}
                                checked={selectedPermissions.has(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id)}
                              />
                              <div className='flex-1'>
                                <label
                                  htmlFor={perm.id}
                                  className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer'
                                >
                                  {perm.action}
                                </label>
                                {perm.description && (
                                  <p className='text-xs text-muted-foreground'>
                                    {perm.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type='submit' disabled={loading}>
              {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {role ? 'Update' : 'Create'} Role
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
