import { z } from 'zod';

// Table status enum
export const tableStatusSchema = z.enum(['available', 'occupied', 'reserved', 'maintenance']);

// Create table schema
export const createTableSchema = z.object({
  number: z.string().min(1, 'Table number is required').max(50, 'Table number is too long'),
  name: z.string().min(1, 'Table name is required').max(255, 'Table name is too long'),
  capacity: z
    .number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .max(100, 'Capacity is too large'),
  status: tableStatusSchema.default('available'),
  locationId: z.string().min(1, 'Location is required'),
});

// Update table schema (all fields optional)
export const updateTableSchema = z.object({
  number: z
    .string()
    .min(1, 'Table number is required')
    .max(50, 'Table number is too long')
    .optional(),
  name: z.string().min(1, 'Table name is required').max(255, 'Table name is too long').optional(),
  capacity: z
    .number()
    .int()
    .min(1, 'Capacity must be at least 1')
    .max(100, 'Capacity is too large')
    .optional(),
  status: tableStatusSchema.optional(),
  locationId: z.string().min(1, 'Location is required').optional(),
});

// Update table status schema (for dedicated status update endpoint)
export const updateTableStatusSchema = z.object({
  status: tableStatusSchema,
});

// Table query parameters
export const tableQuerySchema = z.object({
  status: tableStatusSchema.optional(),
  locationId: z.string().optional(),
  search: z.string().optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;
export type TableQueryInput = z.infer<typeof tableQuerySchema>;
export type TableStatus = z.infer<typeof tableStatusSchema>;
