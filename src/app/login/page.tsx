import { LoginForm } from '@/components/auth/login-form';
import { getOrganizationFromSubdomain, getCurrentSubdomain } from '@/lib/tenant-registration';
import { Suspense } from 'react';
import Link from 'next/link';

async function LoginContent() {
  const tenantInfo = await getOrganizationFromSubdomain();
  const subdomain = await getCurrentSubdomain();

  if (subdomain && !tenantInfo.organization) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4 py-8'>
        <div className='w-full max-w-md'>
          <div className='bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 space-y-6'>
            <div className='text-center'>
              <div className='inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4'>
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
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
              </div>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>Organization Not Found</h1>
              <p className='text-red-600 mb-4'>
                The subdomain <span className='font-semibold'>&quot;{subdomain}&quot;</span> does
                not exist
              </p>
            </div>

            <div className='p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg'>
              <div className='space-y-2 text-sm text-red-800'>
                <p className='font-medium'>This could mean:</p>
                <ul className='space-y-1 ml-4'>
                  <li className='flex items-start'>
                    <span className='mr-2'>•</span>
                    <span>The organization subdomain is incorrect</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2'>•</span>
                    <span>The organization has been deactivated</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2'>•</span>
                    <span>You may have a typo in the URL</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className='space-y-3'>
              <a
                href={`${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${
                  process.env.NODE_ENV === 'production'
                    ? process.env.NEXT_PUBLIC_APP_DOMAIN || 'yourapp.com'
                    : 'localhost:3000'
                }/login`}
                className='block w-full px-4 py-3 bg-blue-600 text-white font-semibold text-center rounded-lg hover:bg-blue-700 transition-colors shadow-md'
              >
                Go to Main Login
              </a>
              <p className='text-center text-sm text-gray-600'>
                Need help?{' '}
                <Link href='/contact' className='text-blue-600 hover:underline font-medium'>
                  Contact support
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8'>
      <div className='w-full max-w-md'>
        {tenantInfo.organization && (
          <div className='mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg shadow-sm'>
            <div className='flex items-center'>
              <div className='shrink-0'>
                <svg className='h-5 w-5 text-blue-500' fill='currentColor' viewBox='0 0 20 20'>
                  <path
                    fillRule='evenodd'
                    d='M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <p className='text-sm font-medium text-blue-800'>
                  Sign in to <strong>{tenantInfo.organization.name}</strong>
                </p>
              </div>
            </div>
          </div>
        )}
        <LoginForm
          organizationName={tenantInfo.organization?.name}
          organizationId={tenantInfo.organizationId}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center px-4'>
          <div className='w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200'>
            <div className='flex flex-col items-center space-y-4'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
              <p className='text-gray-600 font-medium'>Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
