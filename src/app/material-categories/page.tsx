import { Suspense } from 'react';
import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { MaterialCategoriesClient } from '@/components/material-categories/material-categories-client';
import { hasPermission } from '@/lib/rbac';

function MaterialCategoriesSkeleton() {
  return <div className='p-6 animate-pulse bg-gray-100 rounded-lg h-96' />;
}

async function MaterialCategoriesContent() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const canViewProducts = await hasPermission(user.id, 'products:read');

  if (!canViewProducts) {
    return (
      <div className='p-6'>
        <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
        <p className='mt-2 text-gray-600'>
          You do not have permission to view material categories.
        </p>
      </div>
    );
  }

  return <MaterialCategoriesClient />;
}

export default function MaterialCategoriesPage() {
  return (
    <div className='min-h-screen'>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className='rounded-lg shadow'>
          <Suspense fallback={<MaterialCategoriesSkeleton />}>
            <MaterialCategoriesContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
