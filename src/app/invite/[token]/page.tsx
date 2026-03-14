import { Suspense } from 'react';
import { validateInvitationToken } from '@/lib/invitations';
import { InviteAcceptForm } from '@/components/auth/invite-accept-form';
import Link from 'next/link';

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

async function InviteContent({ params }: InvitePageProps) {
  const { token } = await params;
  const validation = await validateInvitationToken(token);

  if (!validation.valid) {
    return (
      <div className='min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-white to-purple-50'>
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
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              </div>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>Invalid Invitation</h1>
              <p className='text-red-600 mb-4'>{validation.error}</p>
            </div>

            <div className='p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg'>
              <div className='space-y-2 text-sm text-red-800'>
                <p className='font-medium'>This could mean:</p>
                <ul className='space-y-1 ml-4'>
                  <li className='flex items-start'>
                    <span className='mr-2'>•</span>
                    <span>The invitation link is incorrect</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2'>•</span>
                    <span>The invitation has already been used</span>
                  </li>
                  <li className='flex items-start'>
                    <span className='mr-2'>•</span>
                    <span>The invitation has expired</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className='space-y-3'>
              <Link
                href='/login'
                className='block w-full px-4 py-3 bg-blue-600 text-white font-semibold text-center rounded-lg hover:bg-blue-700 transition-colors shadow-md'
              >
                Go to Login
              </Link>
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

  const invitation = validation.invitation!;

  return (
    <div className='min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-blue-50 via-white to-purple-50'>
      <div className='w-full max-w-md'>
        <div className='mb-6 p-6 bg-white rounded-xl shadow-lg border border-gray-200'>
          <div className='text-center space-y-2'>
            <div className='inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-2'>
              <svg
                className='w-8 h-8 text-blue-600'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76'
                />
              </svg>
            </div>
            <h2 className='text-xl font-bold text-gray-900'>You&apos;ve been invited!</h2>
            <p className='text-gray-600'>
              Join <strong className='text-blue-600'>{invitation.organizationName}</strong> as{' '}
              {invitation.roleName}
            </p>
          </div>
        </div>

        <InviteAcceptForm
          token={token}
          email={invitation.email}
          name={invitation.name || ''}
          organizationName={invitation.organizationName}
        />
      </div>
    </div>
  );
}

export default function InvitePage(props: InvitePageProps) {
  return (
    <Suspense
      fallback={
        <div className='min-h-screen flex items-center justify-center px-4'>
          <div className='w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-200'>
            <div className='flex flex-col items-center space-y-4'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
              <p className='text-gray-600 font-medium'>Loading invitation...</p>
            </div>
          </div>
        </div>
      }
    >
      <InviteContent {...props} />
    </Suspense>
  );
}
