'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, UserPlus, Users, Mail, Phone } from 'lucide-react';
import { CustomerFormDialog } from './customer-form-dialog';
import { customer } from '@/drizzle/schema/customers';
import type { InferSelectModel } from 'drizzle-orm';

type Customer = InferSelectModel<typeof customer>;

export function CustomersClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`/api/customers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
  });

  return (
    <div className='space-y-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <Users className='h-5 w-5' />
              Customer Management
            </CardTitle>
            <Button onClick={() => setFormDialogOpen(true)}>
              <UserPlus className='h-4 w-4 mr-2' />
              Add Customer
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          {/* Search Bar */}
          <div className='flex gap-2'>
            <div className='flex-1 relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Search by name, email, or phone...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-9'
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            Customers {data?.customers && `(${data.customers.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='space-y-2'>
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className='h-16 w-full' />
              ))}
            </div>
          ) : data?.customers && data.customers.length > 0 ? (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Loyalty Points</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customers.map((customer: Customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className='font-medium'>
                        {customer.name}
                      </TableCell>
                      <TableCell>
                        <div className='space-y-1'>
                          {customer.email && (
                            <div className='flex items-center gap-2 text-sm'>
                              <Mail className='h-3 w-3 text-muted-foreground' />
                              {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className='flex items-center gap-2 text-sm'>
                              <Phone className='h-3 w-3 text-muted-foreground' />
                              {customer.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.address ? (
                          <div className='text-sm text-muted-foreground'>
                            {customer.address}
                            {customer.city && `, ${customer.city}`}
                          </div>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant='secondary'>
                          {customer.loyaltyPoints || 0} pts
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            customer.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className='text-center py-12 text-muted-foreground'>
              <Users className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p>No customers found</p>
              <p className='text-sm'>Add your first customer to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={() => {
          refetch();
          setFormDialogOpen(false);
        }}
      />
    </div>
  );
}
