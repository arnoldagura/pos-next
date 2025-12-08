import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { UsersClient } from '@/components/users/users-client';
import { hasPermission } from '@/lib/rbac';

export default async function UsersPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const canViewUsers = await hasPermission(user.id, 'users:read');

  if (!canViewUsers) {
    return (
      <div className='min-h-screen bg-gray-50'>
        <div className='max-w-7xl mx-auto px-4 py-8'>
          <div className='bg-white rounded-lg shadow p-6'>
            <h1 className='text-2xl font-bold text-red-600'>Access Denied</h1>
            <p className='mt-2 text-gray-600'>
              You do not have permission to view users.
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
          <div className='p-6 border-b'>
            <h1 className='text-3xl font-bold'>User Management</h1>
            <p className='text-gray-600 mt-1'>Manage users and their roles</p>
          </div>
          <UsersClient currentUserId={user.id} />
        </div>
      </div>
    </div>
  );
}
