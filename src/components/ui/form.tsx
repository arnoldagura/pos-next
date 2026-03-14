'use client';

import * as React from 'react';
import {
  useFormContext,
  FormProvider,
  FieldValues,
  UseFormReturn,
  Controller,
  ControllerProps,
  FieldPath,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';

type FormProps<TFieldValues extends FieldValues = FieldValues> = {
  children: React.ReactNode;
  onSubmit: (data: TFieldValues) => void | Promise<void>;
  className?: string;
  form: UseFormReturn<TFieldValues>;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'>;

export function Form<TFieldValues extends FieldValues = FieldValues>({
  children,
  onSubmit,
  className,
  form,
  ...props
}: FormProps<TFieldValues>) {
  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit} className={className} {...props}>
        {children}
      </form>
    </FormProvider>
  );
}

import type { UseFormRegisterReturn } from 'react-hook-form';

type FormFieldLegacyProps = {
  name: string;
  label?: string;
  description?: string;
  children: (field: UseFormRegisterReturn) => React.ReactNode;
  className?: string;
};

export function FormFieldLegacy({
  name,
  label,
  description,
  children,
  className,
}: FormFieldLegacyProps) {
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
      {description && <p className='text-sm text-muted-foreground'>{description}</p>}
      {error && <p className='text-sm font-medium text-destructive'>{error.message as string}</p>}
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
  return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />;
});
FormDescription.displayName = 'FormDescription';

// Context for form fields
type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

// New FormField using Controller
type FormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
  render: ControllerProps<TFieldValues, TName>['render'];
  control?: ControllerProps<TFieldValues, TName>['control'];
  defaultValue?: ControllerProps<TFieldValues, TName>['defaultValue'];
  rules?: ControllerProps<TFieldValues, TName>['rules'];
  shouldUnregister?: ControllerProps<TFieldValues, TName>['shouldUnregister'];
};

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: FormFieldProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();

    return (
      <FormItemContext.Provider value={{ id }}>
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    );
  }
);
FormItem.displayName = 'FormItem';

export const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={!error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = 'FormControl';
