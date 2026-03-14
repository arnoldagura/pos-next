import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { RecipesClient } from '@/components/recipes/recipes-client';
import { hasPermission } from '@/lib/rbac';

export default async function RecipesPage() {
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
            <p className='mt-2 text-gray-600'>
              You do not have permission to view production recipes.
            </p>
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
            <h1 className='text-3xl font-bold'>Production Recipes</h1>
            <p className='text-gray-600 mt-1'>Manage production recipes and formulas</p>
          </div>
          <RecipesClient />
        </div>
      </div>
    </div>
  );
}
