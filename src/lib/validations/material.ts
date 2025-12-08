import { z } from 'zod';

export const materialTypeSchema = z.enum([
  'raw_materials',
  'goods_for_resale',
  'operation_supplies',
  'wip_products',
]);

export const createMaterialSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  sku: z.string().max(100, 'SKU is too long').optional(),
  description: z.string().optional(),
  type: materialTypeSchema,
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  unitOfMeasure: z
    .string()
    .min(1, 'Unit of measure is required')
    .max(50, 'Unit of measure is too long'),
  defaultCost: z
    .number()
    .min(0, 'Default cost must be greater than or equal to 0')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost format'))
    .optional(),
  alertThreshold: z
    .number()
    .min(0, 'Alert threshold must be greater than or equal to 0')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid threshold format'))
    .optional(),
  expiryTracking: z.boolean().default(false),
  image: z.string().optional(),
  status: z.boolean().default(true),
  createdBy: z.string().optional(),
});

export const updateMaterialSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name is too long')
    .optional(),
  sku: z.string().max(100, 'SKU is too long').optional(),
  description: z.string().optional().nullable(),
  type: materialTypeSchema.optional(),
  categoryId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  unitOfMeasure: z
    .string()
    .min(1, 'Unit of measure is required')
    .max(50, 'Unit of measure is too long')
    .optional(),
  defaultCost: z
    .number()
    .min(0, 'Default cost must be greater than or equal to 0')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid cost format'))
    .optional(),
  alertThreshold: z
    .number()
    .min(0, 'Alert threshold must be greater than or equal to 0')
    .or(z.string().regex(/^\d+(\.\d{1,2})?$/, 'Invalid threshold format'))
    .optional(),
  expiryTracking: z.boolean().optional(),
  image: z.string().optional().nullable(),
  status: z.boolean().optional(),
  updatedBy: z.string().optional(),
});

export const createMaterialInventorySchema = z.object({
  materialId: z.string().min(1, 'Material ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  alertThreshold: z.number().min(0).default(0),
  unitOfMeasure: z.string().optional(),
});

export const updateMaterialInventorySchema = z.object({
  alertThreshold: z.number().min(0).optional(),
  unitOfMeasure: z.string().optional(),
});

export const materialMovementTypeSchema = z.enum([
  'purchase',
  'production_consumption',
  'adjustment',
  'waste',
  'expired',
  'transfer_in',
  'transfer_out',
  'transfer_to_pos',
]);

export const createMaterialMovementSchema = z.object({
  materialInventoryId: z.string().min(1, 'Material inventory ID is required'),
  batchId: z.string().optional(),
  type: materialMovementTypeSchema,
  quantity: z.number().refine((val) => val !== 0, {
    message: 'Quantity cannot be zero',
  }),
  unitPrice: z.number().min(0).optional(),
  date: z.string().datetime().optional(),
  remarks: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  createdBy: z.string().optional(),
});

export const createMaterialBatchSchema = z.object({
  materialInventoryId: z.string().min(1, 'Material inventory ID is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().datetime().optional(),
  quantity: z.number().positive('Quantity must be positive'),
  cost: z.number().min(0, 'Cost must be greater than or equal to 0'),
});

export const receiveMaterialSchema = z.object({
  materialInventoryId: z.string().min(1, 'Material inventory ID is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  quantity: z.number().positive('Quantity must be positive'),
  cost: z.number().min(0, 'Cost must be greater than or equal to 0'),
  expiryDate: z.string().datetime().optional(),
  remarks: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  createdBy: z.string().optional(),
});

export type MaterialType = z.infer<typeof materialTypeSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateMaterialInventoryInput = z.infer<
  typeof createMaterialInventorySchema
>;
export type UpdateMaterialInventoryInput = z.infer<
  typeof updateMaterialInventorySchema
>;
export type MaterialMovementType = z.infer<typeof materialMovementTypeSchema>;
export type CreateMaterialMovementInput = z.infer<
  typeof createMaterialMovementSchema
>;
export type CreateMaterialBatchInput = z.infer<
  typeof createMaterialBatchSchema
>;
export type ReceiveMaterialInput = z.infer<typeof receiveMaterialSchema>;
