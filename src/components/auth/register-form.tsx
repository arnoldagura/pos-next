'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signUp, signIn } from '@/lib/auth-client';
import { FormWrapper, FormFieldWrapper } from '../forms/form-wrapper';
import { registerUserSchema, type RegisterUserInput } from '@/lib/validations/user';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Mail, User, UserPlus, Loader2, Store } from 'lucide-react';

interface RegisterFormProps {
  organizationId?: string | null;
  organizationName?: string | null;
}

export function RegisterForm({ organizationId, organizationName }: RegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const targetOrgId = organizationId || searchParams.get('orgId');

  const handleSubmit = async (data: RegisterUserInput) => {
    try {
      setError(null);

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

        const signInResult = await signIn.email({ email: data.email, password: data.password });
        if (signInResult.error) {
          setError('Registration successful, but sign-in failed. Please try logging in.');
          return;
        }
      } else {
        const result = await signUp.email({
          email: data.email,
          password: data.password,
          name: data.name,
        });

        if (result.error) {
          setError(result.error.message || 'Registration failed');
          return;
        }
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
            <h1 className='text-2xl font-bold tracking-tight'>Create an account</h1>
            <p className='text-sm text-muted-foreground'>
              {organizationName ? `Join ${organizationName}` : 'Sign up to get started'}
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
              <div className='space-y-4'>
                <FormFieldWrapper label='Name' error={errors.name?.message} required>
                  <div className='relative'>
                    <User className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                      {...register('name')}
                      type='text'
                      placeholder='John Doe'
                      className='pl-9'
                      autoComplete='name'
                    />
                  </div>
                </FormFieldWrapper>

                <FormFieldWrapper label='Email' error={errors.email?.message} required>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                      {...register('email')}
                      type='email'
                      placeholder='you@example.com'
                      className='pl-9'
                      autoComplete='email'
                    />
                  </div>
                </FormFieldWrapper>

                <FormFieldWrapper
                  label='Password'
                  error={errors.password?.message}
                  description='At least 8 characters with uppercase, lowercase, and number'
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

                <Button type='submit' disabled={isSubmitting} className='w-full gap-2' size='lg'>
                  {isSubmitting ? (
                    <>
                      <Loader2 className='h-4 w-4 animate-spin' />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className='h-4 w-4' />
                      Create account
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
            <span className='px-2 bg-card text-muted-foreground'>Already have an account?</span>
          </div>
        </div>

        <Button variant='outline' className='w-full' asChild>
          <a href='/login'>Sign in instead</a>
        </Button>
      </CardContent>
    </Card>
  );
}
