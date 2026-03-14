'use client';

import * as React from 'react';
import {
  useForm,
  UseFormReturn,
  FieldValues,
  DefaultValues,
  SubmitHandler,
  FieldErrors,
  Resolver,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

type FormWrapperProps<TFieldValues extends FieldValues> = {
  schema: z.ZodType<TFieldValues, FieldValues>;
  defaultValues: DefaultValues<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children: (form: UseFormReturn<TFieldValues>) => React.ReactNode;
  className?: string;
  resetOnSubmit?: boolean;
  id?: string;
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
    resolver: zodResolver(schema) as Resolver<TFieldValues>,
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
    <form onSubmit={form.handleSubmit(handleSubmit)} className={cn('space-y-6', className)}>
      {children(form)}
    </form>
  );
}

type FormFieldWrapperProps = {
  label?: string;
  error?: string | FieldErrors;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
};

export function FormFieldWrapper({
  label,
  error,
  description,
  required,
  children,
  className,
  htmlFor,
}: FormFieldWrapperProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message;

  const fallbackId = React.useId();
  const inputId = htmlFor ?? fallbackId;

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
        >
          {label}
          {required && <span className='text-red-500 ml-1'>*</span>}
        </label>
      )}

      {children}

      {description && !errorMessage && <p className='text-sm text-gray-500'>{description}</p>}

      {errorMessage && (
        <p role='alert' className='text-sm text-red-500 font-medium'>
          {errorMessage.toString()}
        </p>
      )}
    </div>
  );
}
