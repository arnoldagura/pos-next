'use client';

import * as React from 'react';
import {
  useForm,
  UseFormReturn,
  FieldValues,
  DefaultValues,
  SubmitHandler,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ZodType } from 'zod';
import { cn } from '@/lib/utils';

type FormWrapperProps<TFieldValues extends FieldValues> = {
  schema: ZodType<TFieldValues>;
  defaultValues: DefaultValues<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: (form: UseFormReturn<TFieldValues>) => React.ReactNode;
  className?: string;
  resetOnSubmit?: boolean;
};

export function FormWrapper<TFieldValues extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  resetOnSubmit = false,
}: FormWrapperProps<TFieldValues>) {
  const form = useForm<TFieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const handleSubmit = async (data: TFieldValues) => {
    try {
      await onSubmit(data);
      if (resetOnSubmit) {
        form.reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className={cn('space-y-6', className)}
    >
      {children(form)}
    </form>
  );
}

type FormFieldWrapperProps = {
  label?: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function FormFieldWrapper({
  label,
  error,
  description,
  required,
  children,
  className,
}: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className='text-sm font-medium leading-none'>
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}
      {children}
      {description && !error && (
        <p className='text-sm text-gray-500'>{description}</p>
      )}
      {error && <p className='text-sm text-red-500'>{error}</p>}
    </div>
  );
}
