import { z } from 'zod';

export function generateSlug(productName: string, variantName?: string): string {
  const clean = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toLowerCase();

  const product = (clean(productName).substring(0, 6) || 'item').toLowerCase();
  const variant = variantName ? clean(variantName).substring(0, 5).toLowerCase() : null;

  return variant ? `${product}-${variant}` : product;
}

export function generateSku(productName: string, variantName?: string): string {
  const clean = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase();

  const product = clean(productName).substring(0, 6) || 'PROD';
  const variant = variantName ? clean(variantName).substring(0, 5) : null;

  return variant ? `${product}-${variant}` : product;
}

// Product Category Schemas
export const createProductCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  parentId: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateProductCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  description: z.string().optional().nullable(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  parentId: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const productCategoryQuerySchema = z.object({
  parentId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
});

// Material Category Schemas
export const createMaterialCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().optional(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  parentId: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateMaterialCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  description: z.string().optional().nullable(),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug is too long')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  parentId: z.string().optional().nullable(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const materialCategoryQuerySchema = z.object({
  parentId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  includeDeleted: z.enum(['true', 'false']).optional(),
});

// Type exports for Product Categories
export type CreateProductCategoryInput = z.infer<typeof createProductCategorySchema>;
export type UpdateProductCategoryInput = z.infer<typeof updateProductCategorySchema>;
export type ProductCategoryQueryInput = z.infer<typeof productCategoryQuerySchema>;

// Type exports for Material Categories
export type CreateMaterialCategoryInput = z.infer<typeof createMaterialCategorySchema>;
export type UpdateMaterialCategoryInput = z.infer<typeof updateMaterialCategorySchema>;
export type MaterialCategoryQueryInput = z.infer<typeof materialCategoryQuerySchema>;
