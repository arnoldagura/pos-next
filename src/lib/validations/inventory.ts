import { z } from 'zod';

export const createInventorySchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  locationId: z.string().min(1, 'Location ID is required'),
  alertThreshold: z.number().min(0).default(0),
  unitOfMeasure: z.string().optional(),
});

export const updateInventorySchema = z.object({
  alertThreshold: z.number().min(0).optional(),
  unitOfMeasure: z.string().optional(),
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
  inventoryId: z.string().min(1, 'Inventory ID is required'),
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
  inventoryId: z.string().min(1, 'Inventory ID is required'),
  quantity: z.number().refine((val) => val !== 0, {
    message: 'Adjustment quantity cannot be zero',
  }),
  remarks: z.string().min(1, 'Remarks are required for adjustments'),
  createdBy: z.string().optional(),
});

export const wasteSchema = z.object({
  inventoryId: z.string().min(1, 'Inventory ID is required'),
  quantity: z.number().positive('Quantity must be positive'),
  remarks: z.string().min(1, 'Remarks are required for waste records'),
  createdBy: z.string().optional(),
});

export type CreateInventoryInput = z.infer<typeof createInventorySchema>;
export type UpdateInventoryInput = z.infer<typeof updateInventorySchema>;
export type CreateMovementInput = z.infer<typeof createMovementSchema>;
export type AdjustmentInput = z.infer<typeof adjustmentSchema>;
export type WasteInput = z.infer<typeof wasteSchema>;
export type MovementType = z.infer<typeof movementTypeSchema>;
