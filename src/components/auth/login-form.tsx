'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { FormWrapper, FormFieldWrapper } from '../forms/form-wrapper';
import { loginUserSchema, type LoginUserInput } from '@/lib/validations';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: LoginUserInput) => {
    try {
      setError(null);
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        setError(result.error.message || 'Login failed');
        return;
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    }
  };

  return (
    <div className='w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-lg shadow-md'>
      <div className='text-center'>
        <h1 className='text-2xl sm:text-3xl font-bold'>Welcome back</h1>
        <p className='text-gray-600 mt-2 text-sm sm:text-base'>Sign in to your account</p>
      </div>

      {error && (
        <div className='p-3 bg-red-50 border border-red-200 rounded-md' role='alert' aria-live='polite'>
          <p className='text-sm text-red-600'>{error}</p>
        </div>
      )}

      <FormWrapper
        schema={loginUserSchema}
        defaultValues={{ email: '', password: '', rememberMe: false }}
        onSubmit={handleSubmit}
      >
        {(form) => {
          const {
            register,
            formState: { errors, isSubmitting },
          } = form;

          return (
            <>
              <FormFieldWrapper
                label='Email'
                error={errors.email?.message}
                required
              >
                <input
                  {...register('email')}
                  type='email'
                  placeholder='you@example.com'
                  className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  autoComplete='email'
                  aria-invalid={errors.email ? 'true' : 'false'}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label='Password'
                error={errors.password?.message}
                required
              >
                <input
                  {...register('password')}
                  type='password'
                  placeholder='••••••••'
                  className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                  autoComplete='current-password'
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
              </FormFieldWrapper>

              <div className='flex items-center'>
                <input
                  {...register('rememberMe')}
                  type='checkbox'
                  id='rememberMe'
                  className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer'
                />
                <label
                  htmlFor='rememberMe'
                  className='ml-2 block text-sm text-gray-900 cursor-pointer select-none'
                >
                  Remember me
                </label>
              </div>

              <button
                type='submit'
                disabled={isSubmitting}
                className='w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
                aria-label={isSubmitting ? 'Signing in' : 'Sign in to your account'}
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
            </>
          );
        }}
      </FormWrapper>

      <p className='text-center text-sm text-gray-600'>
        Don&apos;t have an account?{' '}
        <a href='/register' className='text-blue-600 hover:underline'>
          Sign up
        </a>
      </p>
    </div>
  );
}
