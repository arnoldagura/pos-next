import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className='min-h-screen '>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        <div className=' rounded-lg shadow p-6'>
          <h1 className='text-3xl font-bold mb-4'>Dashboard</h1>
          <div className='space-y-4'>
            <div>
              <h2 className='text-lg font-semibold'>Welcome back!</h2>
              <p className='text-gray-600'>
                You&apos;re logged in as <strong>{user.name}</strong>
              </p>
              <p className='text-gray-600 text-sm'>{user.email}</p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-6'>
              <div className='border rounded-lg p-4'>
                <h3 className='font-semibold text-gray-700'>User ID</h3>
                <p className='text-sm text-gray-500 mt-1 font-mono truncate'>
                  {user.id}
                </p>
              </div>
              <div className='border rounded-lg p-4'>
                <h3 className='font-semibold text-gray-700'>Email Verified</h3>
                <p className='text-sm text-gray-500 mt-1'>
                  {user.emailVerified ? '✓ Verified' : '✗ Not verified'}
                </p>
              </div>
              <div className='border rounded-lg p-4'>
                <h3 className='font-semibold text-gray-700'>Created At</h3>
                <p className='text-sm text-gray-500 mt-1'>
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
