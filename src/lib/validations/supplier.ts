import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  contactPerson: z
    .string()
    .min(1, 'Contact person is required')
    .max(255, 'Contact person name is too long'),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long').optional(),
  contactPerson: z
    .string()
    .min(1, 'Contact person is required')
    .max(255, 'Contact person name is too long')
    .optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const supplierQuerySchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type SupplierQueryInput = z.infer<typeof supplierQuerySchema>;
