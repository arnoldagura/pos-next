import { z } from 'zod';

/**
 * Common validation schemas that can be reused across forms
 */

// Email validation
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Invalid email address');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Phone number validation (basic)
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format');

// Name validation
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional()
  .or(z.literal(''));

// Positive number validation
export const positiveNumberSchema = z
  .number()
  .positive('Must be a positive number')
  .or(z.string().regex(/^\d+(\.\d+)?$/).transform(Number));

// Integer validation
export const integerSchema = z
  .number()
  .int('Must be a whole number')
  .or(z.string().regex(/^\d+$/).transform(Number));

// Price validation (2 decimal places)
export const priceSchema = z
  .number()
  .nonnegative('Price cannot be negative')
  .multipleOf(0.01, 'Price can only have up to 2 decimal places')
  .or(
    z.string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
      .transform(Number)
  );

// Date validation (future dates only)
export const futureDateSchema = z
  .date()
  .min(new Date(), 'Date must be in the future');

// Date validation (past dates only)
export const pastDateSchema = z
  .date()
  .max(new Date(), 'Date must be in the past');

// File validation
export const fileSchema = (
  maxSizeMB: number = 5,
  allowedTypes?: string[]
) => {
  return z
    .instanceof(File)
    .refine(
      (file) => file.size <= maxSizeMB * 1024 * 1024,
      `File size must be less than ${maxSizeMB}MB`
    )
    .refine(
      (file) => !allowedTypes || allowedTypes.includes(file.type),
      `File type must be one of: ${allowedTypes?.join(', ')}`
    );
};

// Optional email (can be empty or valid email)
export const optionalEmailSchema = z
  .string()
  .email('Invalid email address')
  .optional()
  .or(z.literal(''));

// Confirm password validation helper
export function confirmPasswordSchema(passwordField: string = 'password') {
  return z.object({
    [passwordField]: passwordSchema,
    confirmPassword: z.string(),
  }).refine((data) => data[passwordField] === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
}
