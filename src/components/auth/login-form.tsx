'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth-client';
import { FormWrapper, FormFieldWrapper } from '../forms/form-wrapper';
import { loginUserSchema, type LoginUserInput } from '@/lib/validations';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Mail, LogIn, Loader2, Store } from 'lucide-react';

interface LoginFormProps {
  organizationName?: string | null;
  organizationId?: string | null;
}

export function LoginForm({ organizationName, organizationId }: LoginFormProps = {}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: LoginUserInput) => {
    try {
      setError(null);

      if (organizationId) {
        const validationResponse = await fetch('/api/auth/login-with-org', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email, organizationId }),
        });
        const validationResult = await validationResponse.json();
        if (!validationResponse.ok) {
          setError(validationResult.error || 'Access denied');
          return;
        }
      }

      const result = await signIn.email({ email: data.email, password: data.password });
      if (result.error) {
        setError(result.error.message || 'Invalid email or password');
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    }
  };

  return (
    <Card className='w-full shadow-lg border-border/60'>
      <CardHeader className='pb-0 pt-8 px-8'>
        <div className='flex flex-col items-center text-center space-y-3'>
          <div className='flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-md'>
            <Store className='w-7 h-7' />
          </div>
          <div className='space-y-1'>
            <h1 className='text-2xl font-bold tracking-tight'>Welcome back</h1>
            <p className='text-sm text-muted-foreground'>
              {organizationName
                ? `Sign in to ${organizationName}`
                : 'Sign in to your account to continue'}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className='px-8 pb-8 pt-6 space-y-5'>
        {error && (
          <div
            className='flex items-start gap-3 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive'
            role='alert'
            aria-live='polite'
          >
            <AlertCircle className='w-4 h-4 mt-0.5 shrink-0' />
            <p className='text-sm font-medium'>{error}</p>
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
              <div className='space-y-4'>
                <FormFieldWrapper label='Email' error={errors.email?.message} required>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                      {...register('email')}
                      type='email'
                      placeholder='you@example.com'
                      className='pl-9'
                      autoComplete='email'
                      aria-invalid={errors.email ? 'true' : 'false'}
                    />
                  </div>
                </FormFieldWrapper>

                <FormFieldWrapper label='Password' error={errors.password?.message} required>
                  <PasswordInput
                    {...register('password')}
                    placeholder='••••••••'
                    autoComplete='current-password'
                    aria-invalid={errors.password ? 'true' : 'false'}
                  />
                </FormFieldWrapper>

                <div className='flex items-center gap-2'>
                  <input
                    {...register('rememberMe')}
                    type='checkbox'
                    id='rememberMe'
                    className='h-4 w-4 rounded border-input accent-primary cursor-pointer'
                  />
                  <label
                    htmlFor='rememberMe'
                    className='text-sm text-muted-foreground cursor-pointer select-none'
                  >
                    Remember me
                  </label>
                </div>

                <Button type='submit' disabled={isSubmitting} className='w-full gap-2' size='lg'>
                  {isSubmitting ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className='h-4 w-4' />
                      Sign in
                    </>
                  )}
                </Button>
              </div>
            );
          }}
        </FormWrapper>

        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <div className='w-full border-t border-border' />
          </div>
          <div className='relative flex justify-center text-xs'>
            <span className='px-2 bg-card text-muted-foreground'>New here?</span>
          </div>
        </div>

        <Button variant='outline' className='w-full' asChild>
          <a href='/register'>Create new account</a>
        </Button>
      </CardContent>
    </Card>
  );
}
