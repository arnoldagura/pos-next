'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { FormWrapper, FormFieldWrapper } from '../forms/form-wrapper';
import { z } from 'zod';
import { emailSchema } from '@/lib/validations';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: LoginInput) => {
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
    <div className='w-full max-w-md space-y-6'>
      <div className='text-center'>
        <h1 className='text-2xl font-bold'>Welcome back</h1>
        <p className='text-gray-600 mt-2'>Sign in to your account</p>
      </div>

      {error && (
        <div className='p-3 bg-red-50 border border-red-200 rounded-md'>
          <p className='text-sm text-red-600'>{error}</p>
        </div>
      )}

      <FormWrapper
        schema={loginSchema}
        defaultValues={{ email: '', password: '' }}
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
                />
              </FormFieldWrapper>

              <button
                type='submit'
                disabled={isSubmitting}
                className='w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
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
