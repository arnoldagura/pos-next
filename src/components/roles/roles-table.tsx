'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Users,
  Key,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { RoleFormDialog } from './role-form-dialog';
import { Role } from '@/lib/types/rbac';

export function RolesTable() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/roles');
      if (!response.ok) throw new Error('Failed to fetch roles');

      const data = await response.json();
      setRoles(data.roles || []);
    } catch (error) {
      toast.error('Failed to load roles');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setShowDialog(true);
  };

  const handleDelete = async () => {
    if (!roleToDelete) return;

    try {
      const response = await fetch(`/api/roles/${roleToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete role');
      }

      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete role');
      console.error(error);
    } finally {
      setRoleToDelete(null);
    }
  };

  const handleCreate = () => {
    setSelectedRole(undefined);
    setShowDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='h-5 w-5' />
                Roles Management
              </CardTitle>
              <CardDescription>
                Manage roles and their permissions to control access across your system
              </CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className='h-4 w-4 mr-2' />
              Create Role
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='text-gray-500'>Loading roles...</div>
            </div>
          ) : roles.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <Shield className='h-16 w-16 text-gray-300 mb-4' />
              <p className='text-gray-500 mb-4'>No roles found</p>
              <Button onClick={handleCreate}>
                <Plus className='h-4 w-4 mr-2' />
                Create First Role
              </Button>
            </div>
          ) : (
            <div className='rounded-md border'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className='text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        <Users className='h-4 w-4' />
                        Users
                      </div>
                    </TableHead>
                    <TableHead className='text-center'>
                      <div className='flex items-center justify-center gap-1'>
                        <Key className='h-4 w-4' />
                        Permissions
                      </div>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className='font-medium'>
                        <div className='flex items-center gap-2'>
                          <Shield className='h-4 w-4 text-blue-600' />
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className='text-sm text-gray-600'>
                          {role.description || 'No description'}
                        </span>
                      </TableCell>
                      <TableCell className='text-center'>
                        <Badge variant='secondary'>
                          {role._count?.users || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-center'>
                        <Badge variant='outline'>
                          {role._count?.permissions || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {role.isGlobal ? (
                          <Badge variant='default'>Global</Badge>
                        ) : (
                          <Badge variant='secondary'>Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex gap-2 justify-end'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEdit(role)}
                            title='Edit role'
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setRoleToDelete(role)}
                            disabled={role.isGlobal}
                            title={
                              role.isGlobal
                                ? 'Cannot delete global role'
                                : 'Delete role'
                            }
                          >
                            <Trash2
                              className={`h-4 w-4 ${
                                role.isGlobal ? 'text-gray-400' : 'text-red-500'
                              }`}
                            />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RoleFormDialog
        role={selectedRole}
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={() => {
          fetchRoles();
          setSelectedRole(undefined);
        }}
      />

      <AlertDialog
        open={!!roleToDelete}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <AlertCircle className='h-5 w-5 text-red-500' />
              Delete Role
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role &quot;{roleToDelete?.name}&quot;?
              This action cannot be undone.
              {roleToDelete?._count?.users && roleToDelete._count.users > 0 && (
                <div className='mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded'>
                  <p className='text-yellow-800 text-sm'>
                    Warning: This role is assigned to {roleToDelete._count.users}{' '}
                    user(s). They will lose these permissions.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className='bg-red-500 hover:bg-red-600'
            >
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
