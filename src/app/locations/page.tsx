import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { LocationsClient } from '@/components/locations/locations-client';
import { hasPermission } from '@/lib/rbac';

export default async function LocationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const canViewSettings = await hasPermission(user.id, 'settings:read');

  if (!canViewSettings) {
    return (
      <div className='min-h-screen '>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          <div className=' rounded-lg shadow p-6'>
            <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
            <p className='mt-2 text-gray-600'>
              You do not have permission to view locations.
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
          <LocationsClient />
        </div>
      </div>
    </div>
  );
}
