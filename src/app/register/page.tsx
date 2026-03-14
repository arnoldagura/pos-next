import { RegisterForm } from '@/components/auth/register-form';
import { getRegistrationTenant } from '@/lib/tenant-registration';
import { Suspense } from 'react';

interface RegisterPageProps {
  searchParams: Promise<{ org?: string; orgId?: string }>;
}

async function RegisterContent({ searchParams }: RegisterPageProps) {
  const params = await searchParams;

  // Get tenant information from URL (subdomain or query parameter)
  const tenantInfo = await getRegistrationTenant(params);

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
                  You are registering for <strong>{tenantInfo.organization.name}</strong>
                </p>
              </div>
            </div>
          </div>
        )}
        <RegisterForm
          organizationId={tenantInfo.organizationId}
          organizationName={tenantInfo.organization?.name}
        />
      </div>
    </div>
  );
}

export default function RegisterPage(props: RegisterPageProps) {
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
      <RegisterContent {...props} />
    </Suspense>
  );
}
