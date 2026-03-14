import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/rbac';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const ProductsClient = dynamic(
  () =>
    import('@/components/products/products-client').then((mod) => ({
      default: mod.ProductsClient,
    })),
  {
    loading: () => <ProductsLoadingSkeleton />,
  }
);

function ProductsLoadingSkeleton() {
  return (
    <div className='p-6 space-y-4 animate-pulse'>
      <div className='h-10 bg-gray-200 rounded w-full'></div>
      <div className='h-64 bg-gray-200 rounded w-full'></div>
    </div>
  );
}

export default async function ProductsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const canViewInventory = await hasPermission(user.id, 'inventory:read');

  if (!canViewInventory) {
    return (
      <div className='min-h-screen '>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          <div className=' rounded-lg shadow p-6'>
            <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
            <p className='mt-2 text-gray-600'>You do not have permission to view products.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen '>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className=' rounded-lg shadow'>
          <div className='p-6 border-b'>
            <h1 className='text-3xl font-bold'>Product Management</h1>
            <p className='text-gray-600 mt-1'>Manage your product inventory</p>
          </div>
          <Suspense fallback={<ProductsLoadingSkeleton />}>
            <ProductsClient />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
