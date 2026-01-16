import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/rbac';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const CustomersClient = dynamic(
  () =>
    import('@/components/customers/customers-client').then((mod) => ({
      default: mod.CustomersClient,
    })),
  {
    loading: () => <CustomersLoadingSkeleton />,
  }
);

function CustomersLoadingSkeleton() {
  return (
    <div className='p-6 space-y-4 animate-pulse'>
      <div className='h-10 bg-gray-200 rounded w-1/3'></div>
      <div className='h-64 bg-gray-200 rounded w-full'></div>
    </div>
  );
}

export default async function CustomersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // For now, use products permission until customer permissions are seeded
  const canViewCustomers = await hasPermission(user.id, 'products:read');

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
        <Suspense fallback={<CustomersLoadingSkeleton />}>
          <CustomersClient />
        </Suspense>
      </div>
    </div>
  );
}
