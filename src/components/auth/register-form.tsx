'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp, signIn } from '@/lib/auth-client';
import { FormWrapper, FormFieldWrapper } from '../forms/form-wrapper';
import { registerUserSchema, type RegisterUserInput } from '@/lib/validations/user';
import { PasswordInput } from '@/components/ui/password-input';

interface RegisterFormProps {
  organizationId?: string | null;
  organizationName?: string | null;
}

export function RegisterForm({ organizationId, organizationName }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  // Get organization from props or query parameter
  const targetOrgId = organizationId || searchParams.get('orgId');

  const handleSubmit = async (data: RegisterUserInput) => {
    try {
      setError(null);

      // If organizationId is provided, use custom registration endpoint
      if (targetOrgId) {
        const response = await fetch('/api/auth/register-with-org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: data.password,
            organizationId: targetOrgId,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setError(result.error || 'Registration failed');
          return;
        }

        // Sign in the user after registration
        const signInResult = await signIn.email({
          email: data.email,
          password: data.password,
        });

        if (signInResult.error) {
          setError('Registration successful, but sign-in failed. Please try logging in.');
          return;
        }

        // Redirect to dashboard on success
        router.push('/dashboard');
        router.refresh();
      } else {
        // Standard registration (no organization)
        const result = await signUp.email({
          email: data.email,
          password: data.password,
          name: data.name,
        });

        if (result.error) {
          setError(result.error.message || 'Registration failed');
          return;
        }

        // Redirect to dashboard on success
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Registration error:', err);
    }
  };

  return (
    <div className='w-full space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200'>
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
              d='M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
            />
          </svg>
        </div>
        <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Create an account</h1>
        <p className='text-gray-600 text-sm sm:text-base'>
          {organizationName ? `Join ${organizationName}` : 'Sign up to get started'}
        </p>
      </div>

      {error && (
        <div
          className='p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg'
          role='alert'
          aria-live='polite'
        >
          <div className='flex items-start'>
            <svg
              className='shrink-0 w-5 h-5 text-red-500 mt-0.5'
              fill='currentColor'
              viewBox='0 0 20 20'
            >
              <path
                fillRule='evenodd'
                d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                clipRule='evenodd'
              />
            </svg>
            <p className='ml-3 text-sm font-medium text-red-800'>{error}</p>
          </div>
        </div>
      )}

      <FormWrapper
        schema={registerUserSchema}
        defaultValues={{ name: '', email: '', password: '', confirmPassword: '' }}
        onSubmit={handleSubmit}
      >
        {(form) => {
          const {
            register,
            formState: { errors, isSubmitting },
          } = form;

          return (
            <>
              <FormFieldWrapper label='Name' error={errors.name?.message} required>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <svg
                      className='h-5 w-5 text-gray-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                      />
                    </svg>
                  </div>
                  <input
                    {...register('name')}
                    type='text'
                    placeholder='John Doe'
                    className='w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                    autoComplete='name'
                  />
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper label='Email' error={errors.email?.message} required>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                    <svg
                      className='h-5 w-5 text-gray-400'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207'
                      />
                    </svg>
                  </div>
                  <input
                    {...register('email')}
                    type='email'
                    placeholder='you@example.com'
                    className='w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                    autoComplete='email'
                  />
                </div>
              </FormFieldWrapper>

              <FormFieldWrapper
                label='Password'
                error={errors.password?.message}
                description='Must be at least 8 characters with uppercase, lowercase, and number'
                required
              >
                <PasswordInput
                  {...register('password')}
                  placeholder='••••••••'
                  autoComplete='new-password'
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label='Confirm Password'
                error={errors.confirmPassword?.message}
                required
              >
                <PasswordInput
                  {...register('confirmPassword')}
                  placeholder='••••••••'
                  autoComplete='new-password'
                />
              </FormFieldWrapper>

              <button
                type='submit'
                disabled={isSubmitting}
                className='w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-md'
                aria-label={isSubmitting ? 'Creating account' : 'Create your account'}
              >
                {isSubmitting ? (
                  <span className='flex items-center justify-center'>
                    <svg
                      className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                    Creating account...
                  </span>
                ) : (
                  'Create account'
                )}
              </button>
            </>
          );
        }}
      </FormWrapper>

      <div className='relative'>
        <div className='absolute inset-0 flex items-center'>
          <div className='w-full border-t border-gray-300' />
        </div>
        <div className='relative flex justify-center text-sm'>
          <span className='px-2 bg-white text-gray-500'>Already have an account?</span>
        </div>
      </div>

      <div className='text-center'>
        <a
          href='/login'
          className='inline-flex items-center justify-center w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'
        >
          Sign in instead
        </a>
      </div>
    </div>
  );
}
