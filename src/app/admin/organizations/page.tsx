'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Search, MoreVertical, Edit, Trash, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrganizationFormDialog } from '@/components/admin/organization-form-dialog';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Organization } from '@/lib/types/organization';

interface OrganizationsResponse {
  organizations: Organization[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const statusColors = {
  active: 'bg-green-500/10 text-green-500',
  trial: 'bg-blue-500/10 text-blue-500',
  suspended: 'bg-yellow-500/10 text-yellow-500',
  cancelled: 'bg-red-500/10 text-red-500',
};

const tierColors = {
  starter: 'bg-gray-500/10 text-gray-500',
  professional: 'bg-purple-500/10 text-purple-500',
  enterprise: 'bg-orange-500/10 text-orange-500',
};

export default function OrganizationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<OrganizationsResponse>({
    queryKey: ['organizations', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const res = await fetch(`/api/organizations?${params}`);
      if (!res.ok) throw new Error('Failed to fetch organizations');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/organizations/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete organization');
      return res.json();
    },
    onSuccess: () => {
      toast.success('Organization deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete organization');
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (
      confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Organizations</h1>
          <p className='text-muted-foreground mt-1'>
            Manage all organizations and tenants in your system
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className='mr-2 h-4 w-4' />
          New Organization
        </Button>
      </div>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Total Organizations</CardDescription>
            <CardTitle className='text-3xl'>
              {data?.pagination.total || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Active</CardDescription>
            <CardTitle className='text-3xl text-green-500'>
              {data?.organizations.filter((o) => o.status === 'active')
                .length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Trial</CardDescription>
            <CardTitle className='text-3xl text-blue-500'>
              {data?.organizations.filter((o) => o.status === 'trial').length ||
                0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardDescription>Suspended</CardDescription>
            <CardTitle className='text-3xl text-yellow-500'>
              {data?.organizations.filter((o) => o.status === 'suspended')
                .length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardContent className='pt-6'>
          <div className='flex gap-4'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search organizations...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-9'
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='All Statuses' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Statuses</SelectItem>
                <SelectItem value='active'>Active</SelectItem>
                <SelectItem value='trial'>Trial</SelectItem>
                <SelectItem value='suspended'>Suspended</SelectItem>
                <SelectItem value='cancelled'>Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className='w-[50px]'></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-center py-8'>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.organizations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className='text-center py-8'>
                    No organizations found
                  </TableCell>
                </TableRow>
              ) : (
                data?.organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <div className='font-medium'>{org.name}</div>
                        {org.subdomain && (
                          <div className='text-xs text-muted-foreground'>
                            {org.subdomain}.
                            {process.env.NODE_ENV === 'development'
                              ? 'localhost:3000'
                              : process.env.NEXT_PUBLIC_APP_DOMAIN ||
                                'yourdomain.com'}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs bg-muted px-2 py-1 rounded'>
                        {org.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[org.status]}
                        variant='secondary'
                      >
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={tierColors[org.subscriptionTier]}
                        variant='secondary'
                      >
                        {org.subscriptionTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Users className='h-4 w-4 text-muted-foreground' />
                        <span>
                          {org.userCount}/{org.maxUsers}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {formatDistanceToNow(new Date(org.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='sm'>
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => setEditingOrg(org)}>
                            <Edit className='mr-2 h-4 w-4' />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(org.id, org.name)}
                            className='text-red-600'
                          >
                            <Trash className='mr-2 h-4 w-4' />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.pagination.totalPages > 1 && (
        <div className='flex items-center justify-between'>
          <div className='text-sm text-muted-foreground'>
            Showing {(page - 1) * 10 + 1} to{' '}
            {Math.min(page * 10, data.pagination.total)} of{' '}
            {data.pagination.total} organizations
          </div>
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
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      <OrganizationFormDialog
        open={isCreateDialogOpen || editingOrg !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingOrg(null);
          }
        }}
        organization={editingOrg}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          setEditingOrg(null);
          queryClient.invalidateQueries({ queryKey: ['organizations'] });
        }}
      />
    </div>
  );
}
