import { z } from 'zod';

// Helper function to generate slug from name (reused from category)
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Product Schemas
export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  sku: z.string().max(100, 'SKU is too long').optional(),
  barcode: z.string().max(100, 'Barcode is too long').optional(),
  description: z.string().optional(),
  sellingPrice: z
    .number()
    .min(0, 'Selling price must be greater than or equal to 0')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')),
  costPrice: z
    .number()
    .min(0, 'Cost price must be greater than or equal to 0')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'))
    .optional(),
  categoryId: z.string().optional().nullable(),
  image: z.string().optional(),
  status: z.boolean().default(true),
  unitOfMeasure: z.string().max(50, 'Unit of measure is too long').optional(),
  taxRate: z
    .number()
    .min(0, 'Tax rate must be greater than or equal to 0')
    .max(100, 'Tax rate must be less than or equal to 100')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid tax rate format'))
    .default(0),
  createdBy: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name is too long')
    .optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  sku: z.string().max(100, 'SKU is too long').optional(),
  barcode: z.string().max(100, 'Barcode is too long').optional(),
  description: z.string().optional().nullable(),
  sellingPrice: z
    .number()
    .min(0, 'Selling price must be greater than or equal to 0')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'))
    .optional(),
  costPrice: z
    .number()
    .min(0, 'Cost price must be greater than or equal to 0')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format'))
    .optional(),
  categoryId: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  status: z.boolean().optional(),
  unitOfMeasure: z.string().max(50, 'Unit of measure is too long').optional(),
  taxRate: z
    .number()
    .min(0, 'Tax rate must be greater than or equal to 0')
    .max(100, 'Tax rate must be less than or equal to 100')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid tax rate format'))
    .optional(),
  updatedBy: z.string().optional(),
});

export const productQuerySchema = z.object({
  categoryId: z.string().optional(),
  status: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  minPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').optional(),
  maxPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format').optional(),
});

// Type exports
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
