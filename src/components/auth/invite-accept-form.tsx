'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormWrapper, FormFieldWrapper } from '../forms/form-wrapper';
import { registerUserSchema, type RegisterUserInput } from '@/lib/validations/user';
import { PasswordInput } from '@/components/ui/password-input';
import { signIn } from '@/lib/auth-client';

interface InviteAcceptFormProps {
  token: string;
  email: string;
  name: string;
  organizationName: string;
}

export function InviteAcceptForm({
  token,
  email,
  name: defaultName,
  organizationName,
}: InviteAcceptFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: RegisterUserInput) => {
    try {
      setError(null);

      // Accept invitation and create account
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to accept invitation');
        return;
      }

      // Sign in the newly created user
      const signInResult = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (signInResult.error) {
        setError('Account created but sign-in failed. Please try logging in.');
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Invitation acceptance error:', err);
    }
  };

  return (
    <div className='w-full space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200'>
      <div className='text-center space-y-2'>
        <h1 className='text-2xl sm:text-3xl font-bold text-gray-900'>Complete Your Registration</h1>
        <p className='text-gray-600 text-sm sm:text-base'>
          Create your account to join {organizationName}
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
        defaultValues={{
          name: defaultName || '',
          email,
          password: '',
          confirmPassword: '',
        }}
        onSubmit={handleSubmit}
      >
        {(form) => {
          const {
            register,
            formState: { errors, isSubmitting },
          } = form;

          return (
            <>
              <FormFieldWrapper label='Full Name' error={errors.name?.message} required>
                <input
                  {...register('name')}
                  type='text'
                  placeholder='John Doe'
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'
                  autoComplete='name'
                />
              </FormFieldWrapper>

              <FormFieldWrapper label='Email' error={errors.email?.message} required>
                <input
                  {...register('email')}
                  type='email'
                  disabled
                  className='w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed'
                />
                <p className='mt-1 text-xs text-gray-500'>Email cannot be changed</p>
              </FormFieldWrapper>

              <FormFieldWrapper label='Password' error={errors.password?.message} required>
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
                  'Create Account & Join'
                )}
              </button>
            </>
          );
        }}
      </FormWrapper>
    </div>
  );
}
