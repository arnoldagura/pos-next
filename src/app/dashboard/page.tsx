import { getCurrentUser } from '@/lib/session';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { getTenantId } from '@/lib/tenant-context';
import { TenantAccessDeniedError } from '@/lib/errors/tenant-errors';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  let tenantId: string | null = null;
  let accessError: TenantAccessDeniedError | null = null;

  try {
    tenantId = await getTenantId();
  } catch (error) {
    if (error instanceof TenantAccessDeniedError) {
      accessError = error;
    } else {
      throw error;
    }
  }

  if (accessError) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4'>
        <div className='max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200'>
          <div className='text-center space-y-4'>
            <div className='inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-2'>
              <svg
                className='w-8 h-8 text-red-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                />
              </svg>
            </div>
            <h1 className='text-2xl font-bold text-gray-900'>Access Denied</h1>
            <p className='text-gray-600'>{accessError.message}</p>
            <div className='pt-4'>
              <Link
                href='/login'
                className='inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors'
              >
                Go to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4'>
        <div className='max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-200'>
          <div className='text-center space-y-4'>
            <div className='inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-2'>
              <svg
                className='w-8 h-8 text-yellow-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>
            <h1 className='text-2xl font-bold text-gray-900'>
              No Organization Access
            </h1>
            <p className='text-gray-600'>
              You are not assigned to any organization. Please contact your
              administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen p-4 md:p-8'>
      <div className='max-w-7xl mx-auto'>
        <DashboardClient />
      </div>
    </div>
  );
}
