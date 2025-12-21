import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { CustomersClient } from '@/components/customers/customers-client';
import { hasPermission } from '@/lib/rbac';

export default async function CustomersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // For now, use products permission until customer permissions are seeded
  const canViewCustomers = await hasPermission(user.id, 'read', 'products');

  if (!canViewCustomers) {
    return (
      <div className='min-h-screen'>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          <div className='rounded-lg shadow p-6'>
            <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
            <p className='mt-2 text-gray-600'>
              You do not have permission to view customers.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen'>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className='mb-6'>
          <h1 className='text-3xl font-bold'>Customer Management</h1>
          <p className='text-gray-600 mt-1'>
            Manage customer profiles, track orders, and loyalty points
          </p>
        </div>
        <CustomersClient />
      </div>
    </div>
  );
}
