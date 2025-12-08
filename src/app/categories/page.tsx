import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { CategoriesClient } from '@/components/categories/categories-client';
import { hasPermission } from '@/lib/rbac';

export default async function CategoriesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const canViewProducts = await hasPermission(user.id, 'products:read');

  if (!canViewProducts) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          <div className='bg-white rounded-lg shadow p-6'>
            <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
            <p className='mt-2 text-gray-600'>
              You do not have permission to view categories.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className='bg-white rounded-lg shadow'>
          <CategoriesClient />
        </div>
      </div>
    </div>
  );
}
