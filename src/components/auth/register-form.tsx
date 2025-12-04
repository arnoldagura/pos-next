'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signUp } from '@/lib/auth-client';
import { FormWrapper, FormFieldWrapper } from '../forms/form-wrapper';
import { registerUserSchema, type RegisterUserInput } from '@/lib/validations/user';

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: RegisterUserInput) => {
    try {
      setError(null);
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
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Registration error:', err);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-gray-600 mt-2">Sign up to get started</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
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
              <FormFieldWrapper
                label="Name"
                error={errors.name?.message}
                required
              >
                <input
                  {...register('name')}
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="name"
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Email"
                error={errors.email?.message}
                required
              >
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="email"
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Password"
                error={errors.password?.message}
                description="Must be at least 8 characters with uppercase, lowercase, and number"
                required
              >
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="new-password"
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Confirm Password"
                error={errors.confirmPassword?.message}
                required
              >
                <input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoComplete="new-password"
                />
              </FormFieldWrapper>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
            </>
          );
        }}
      </FormWrapper>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <a href="/login" className="text-blue-600 hover:underline">
          Sign in
        </a>
      </p>
    </div>
  );
}
