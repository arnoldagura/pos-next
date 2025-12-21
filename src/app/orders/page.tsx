import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { OrdersClient } from '@/components/orders/orders-client';
import { hasPermission } from '@/lib/rbac';

export default async function OrdersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const canViewOrders = await hasPermission(user.id, 'view', 'orders');

  if (!canViewOrders) {
    return (
      <div className='min-h-screen'>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          <div className='rounded-lg shadow p-6'>
            <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
            <p className='mt-2 text-gray-600'>
              You do not have permission to view orders.
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
          <h1 className='text-3xl font-bold'>Order Management</h1>
          <p className='text-gray-600 mt-1'>
            View and manage all orders with advanced search and filtering
          </p>
        </div>
        <OrdersClient />
      </div>
    </div>
  );
}
