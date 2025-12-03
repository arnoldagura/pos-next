'use client';

import * as React from 'react';
import { useFormContext, FormProvider, FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';

type FormProps<TFieldValues extends FieldValues> = {
  children: React.ReactNode;
  onSubmit: (data: TFieldValues) => void | Promise<void>;
  className?: string;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>;

export function Form<TFieldValues extends FieldValues>({
  children,
  onSubmit,
  className,
  ...props
}: FormProps<TFieldValues> & { form: any }) {
  const handleSubmit = props.form.handleSubmit(onSubmit);

  return (
    <FormProvider {...props.form}>
      <form onSubmit={handleSubmit} className={className} {...props}>
        {children}
      </form>
    </FormProvider>
  );
}

type FormFieldProps = {
  name: string;
  label?: string;
  description?: string;
  children: (field: any) => React.ReactNode;
  className?: string;
};

export function FormField({
  name,
  label,
  description,
  children,
  className,
}: FormFieldProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name];
  const field = register(name);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={name}
          className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
        >
          {label}
        </label>
      )}
      {children(field)}
      {description && (
        <p className='text-sm text-muted-foreground'>{description}</p>
      )}
      {error && (
        <p className='text-sm font-medium text-destructive'>
          {error.message as string}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className='text-sm font-medium text-destructive'>{children}</p>;
}

export const FormLabel = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';
