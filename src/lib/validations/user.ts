import { z } from 'zod';
import { emailSchema, nameSchema, passwordSchema } from './common';

// User registration schema
export const registerUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

// User login schema
export const loginUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginUserInput = z.infer<typeof loginUserSchema>;

// Update user profile schema
export const updateUserProfileSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  age: z.number().int().min(1).max(150).optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

// Create user schema (for admin)
export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  age: z.number().int().min(1).max(150),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
