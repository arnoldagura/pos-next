'use client';

import { useState, useEffect } from 'react';
import { Search, Pencil, Trash2, Shield } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserFormDialog } from './user-form-dialog';
import { DeleteUserDialog } from './delete-user-dialog';
import { RoleAssignmentDialog } from './role-assignment-dialog';
import { toast } from 'sonner';

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  roles: { id: string; name: string }[];
};

type UsersClientProps = {
  currentUserId: string;
};

export function UsersClient({ currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        search,
      });

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) throw new Error('Failed to fetch users');

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setShowRoleDialog(true);
  };

  const handleUserUpdated = () => {
    fetchUsers();
    setShowEditDialog(false);
    setSelectedUser(null);
  };

  const handleUserDeleted = () => {
    fetchUsers();
    setShowDeleteDialog(false);
    setSelectedUser(null);
  };

  const handleRolesUpdated = () => {
    fetchUsers();
    setShowRoleDialog(false);
    setSelectedUser(null);
  };

  return (
    <div className='p-6 space-y-4'>
      <div className='flex items-center gap-4'>
        <div className='flex-1 relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
          <Input
            placeholder='Search users by name or email...'
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className='pl-9'
          />
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-12'>
          <div className='text-gray-500'>Loading users...</div>
        </div>
      ) : (
        <>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='text-center py-8'>
                      <p className='text-gray-500'>No users found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className='font-medium'>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <div className='flex gap-1 flex-wrap'>
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <Badge key={role.id} variant='secondary'>
                                {role.name}
                              </Badge>
                            ))
                          ) : (
                            <span className='text-gray-400 text-sm'>
                              No roles
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.emailVerified ? (
                          <Badge variant='default'>Verified</Badge>
                        ) : (
                          <Badge variant='outline'>Unverified</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex gap-2 justify-end'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleManageRoles(user)}
                            disabled={user.id === currentUserId}
                            title='Manage Roles'
                          >
                            <Shield className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleEdit(user)}
                            title='Edit User'
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => handleDelete(user)}
                            disabled={user.id === currentUserId}
                            title='Delete User'
                          >
                            <Trash2 className='h-4 w-4 text-red-500' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className='flex items-center justify-between'>
              <p className='text-sm text-gray-600'>
                Page {page} of {totalPages}
              </p>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedUser && (
        <>
          <UserFormDialog
            user={selectedUser}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
            onSuccess={handleUserUpdated}
          />
          <DeleteUserDialog
            user={selectedUser}
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            onSuccess={handleUserDeleted}
          />
          <RoleAssignmentDialog
            user={selectedUser}
            open={showRoleDialog}
            onOpenChange={setShowRoleDialog}
            onSuccess={handleRolesUpdated}
          />
        </>
      )}
    </div>
  );
}
