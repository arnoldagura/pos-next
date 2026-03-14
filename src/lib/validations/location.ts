import { z } from 'zod';

// Create location schema
export const createLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
});

// Update location schema (all fields optional)
export const updateLocationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  address: z.string().min(1, 'Address is required').optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

// Location query parameters
export const locationQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type LocationQueryInput = z.infer<typeof locationQuerySchema>;
