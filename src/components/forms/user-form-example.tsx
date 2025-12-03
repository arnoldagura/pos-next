'use client';

import { FormWrapper, FormFieldWrapper } from './form-wrapper';
import { createUserSchema, type CreateUserInput } from '@/lib/validations/user';

/**
 * Example form component demonstrating React Hook Form + Zod integration
 * This form creates a new user with validation
 */

type UserFormExampleProps = {
  onSubmit: (data: CreateUserInput) => void | Promise<void>;
  defaultValues?: Partial<CreateUserInput>;
};

export function UserFormExample({
  onSubmit,
  defaultValues = { name: '', email: '', age: 18 },
}: UserFormExampleProps) {
  return (
    <FormWrapper
      schema={createUserSchema}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      resetOnSubmit={true}
      className="max-w-md space-y-4"
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
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              label="Email"
              error={errors.email?.message}
              description="We'll never share your email"
              required
            >
              <input
                {...register('email')}
                type="email"
                placeholder="john@example.com"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormFieldWrapper>

            <FormFieldWrapper label="Age" error={errors.age?.message} required>
              <input
                {...register('age', { valueAsNumber: true })}
                type="number"
                min="1"
                max="150"
                placeholder="25"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </FormFieldWrapper>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create User'}
            </button>
          </>
        );
      }}
    </FormWrapper>
  );
}

/**
 * Alternative example using the basic Form components
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormField } from '../ui/form';

export function UserFormAlternative({
  onSubmit,
}: {
  onSubmit: (data: CreateUserInput) => void;
}) {
  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      age: 18,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="max-w-md space-y-4"
    >
      <FormField name="name" label="Name">
        {(field) => (
          <input
            {...field}
            type="text"
            placeholder="John Doe"
            className="w-full px-3 py-2 border rounded-md"
          />
        )}
      </FormField>

      <FormField name="email" label="Email" description="Your email address">
        {(field) => (
          <input
            {...field}
            type="email"
            placeholder="john@example.com"
            className="w-full px-3 py-2 border rounded-md"
          />
        )}
      </FormField>

      <FormField name="age" label="Age">
        {(field) => (
          <input
            {...field}
            type="number"
            min="1"
            max="150"
            className="w-full px-3 py-2 border rounded-md"
          />
        )}
      </FormField>

      <button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
      >
        {form.formState.isSubmitting ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
