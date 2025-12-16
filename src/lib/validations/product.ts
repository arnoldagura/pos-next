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
    .regex(
      /^[a-z0-9-]+$/,
      'Slug must contain only lowercase letters, numbers, and hyphens'
    )
    .optional(),
  description: z.string().optional(),
  categoryId: z.string().optional().nullable(),
  image: z.string().optional(),
  status: z.boolean().default(true),
  createdBy: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name is too long')
    .optional(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  status: z.boolean().optional(),

  updatedBy: z.string().optional(),
});

export const productQuerySchema = z.object({
  categoryId: z.string().optional(),
  status: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  minPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
    .optional(),
  maxPrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
    .optional(),
});

export const createProductInventorySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  variantName: z.string().optional(),
  barcode: z.string().optional(),
  unitPrice: z.number().positive('Unit price must be positive'),
  cost: z.number().min(0).optional(),
  currentQuantity: z.number().optional(),
  unitOfMeasure: z.string().min(1, 'Unit of measure is required'),
  taxRate: z.number().min(0).max(100).default(0),
  alertThreshold: z.number().min(0).default(0),
});

export const updateInventorySchema = z.object({
  variantName: z.string().optional(),
  slug: z.string().min(1, 'Slug is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  unitPrice: z.number().positive().optional(),
  cost: z.number().min(0).optional(),
  unitOfMeasure: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  alertThreshold: z.number().min(0).optional(),
});

export const movementTypeSchema = z.enum([
  'purchase',
  'sale',
  'adjustment',
  'waste',
  'transfer_in',
  'transfer_out',
  'production_output',
  'receive_from_material',
]);

export const createMovementSchema = z.object({
  productInventoryId: z.string().min(1, 'Product Inventory ID is required'),
  type: movementTypeSchema,
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().min(0).optional(),
  date: z.string().datetime().optional(),
  remarks: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  createdBy: z.string().optional(),
});

export const adjustmentSchema = z.object({
  productInventoryId: z.string().min(1, 'Product Inventory ID is required'),
  quantity: z.number().refine((val) => val !== 0, {
    message: 'Adjustment quantity cannot be zero',
  }),
  remarks: z.string().min(1, 'Remarks are required for adjustments'),
  createdBy: z.string().optional(),
});

export const wasteSchema = z.object({
  productInventoryId: z.string().min(1, 'Product Inventory ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  remarks: z.string().min(1, 'Remarks are required for waste records'),
  createdBy: z.string().optional(),
});

export type CreateInventoryInput = z.infer<typeof createProductInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type WasteInput = z.infer<typeof wasteSchema>;
export type MovementType = z.infer<typeof movementTypeSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
