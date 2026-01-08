import { z } from 'zod';
import { optionalEmailSchema } from './common';

/**
 * Validation schemas for organization/tenant management
 */

// Organization status enum
export const organizationStatusSchema = z.enum([
  'active',
  'suspended',
  'trial',
  'cancelled',
]);

// Subscription tier enum
export const subscriptionTierSchema = z.enum([
  'starter',
  'professional',
  'enterprise',
]);

// POS settings schema
export const posSettingsSchema = z.object({
  taxRate: z.number().min(0).max(1).default(0),
  currency: z.string().length(3).default('USD'),
  currencySymbol: z.string().max(5).default('$'),
  receiptHeader: z.string().max(200).default('Thank you for your business!'),
  receiptFooter: z.string().max(200).default('Please come again'),
  allowDiscounts: z.boolean().default(true),
  maxDiscountPercent: z.number().min(0).max(100).default(20),
  requireCustomerInfo: z.boolean().default(false),
  enableTipping: z.boolean().default(false),
  defaultTipPercent: z.number().min(0).max(100).default(10),
  paymentMethods: z.array(z.string()).default(['cash', 'card']),
  defaultPaymentMethod: z.string().default('cash'),
  autoCompleteOrders: z.boolean().default(true),
  printReceiptAuto: z.boolean().default(false),
  enableTableService: z.boolean().default(true),
  requireCashierApproval: z.boolean().default(false),
  approvalThreshold: z.number().min(0).default(1000),
});

// Feature settings schema
export const featureSettingsSchema = z.object({
  advancedInventory: z.boolean().default(false),
  multiLocation: z.boolean().default(false),
  productionOrders: z.boolean().default(false),
  customerManagement: z.boolean().default(true),
  loyaltyProgram: z.boolean().default(false),
  advancedReporting: z.boolean().default(false),
  apiAccess: z.boolean().default(false),
});

// Branding settings schema
export const brandingSettingsSchema = z.object({
  logo: z.string().url().optional().or(z.literal('')).default(''),
  faviconUrl: z.string().url().optional().or(z.literal('')).default(''),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#3b82f6'),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#8b5cf6'),
  companyName: z.string().max(100).default(''),
});

// Notification settings schema
export const notificationSettingsSchema = z.object({
  lowStockAlert: z.boolean().default(true),
  lowStockThreshold: z.number().min(0).default(10),
  dailySalesReport: z.boolean().default(false),
  weeklySalesReport: z.boolean().default(false),
  reportEmail: optionalEmailSchema.default(''),
  orderNotifications: z.boolean().default(true),
  inventoryAlerts: z.boolean().default(true),
});

// Inventory settings schema
export const inventorySettingsSchema = z.object({
  trackSerialNumbers: z.boolean().default(false),
  enableBarcodeScanning: z.boolean().default(true),
  autoDeductInventory: z.boolean().default(true),
  allowNegativeStock: z.boolean().default(false),
  defaultReorderPoint: z.number().min(0).default(20),
});

// Complete organization settings schema
export const organizationSettingsSchema = z.object({
  pos: posSettingsSchema,
  features: featureSettingsSchema,
  branding: brandingSettingsSchema,
  notifications: notificationSettingsSchema,
  inventory: inventorySettingsSchema,
});

// Create organization schema
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      'Slug can only contain lowercase letters, numbers, and hyphens'
    )
    .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), {
      message: 'Slug cannot start or end with a hyphen',
    }),
  subdomain: z
    .string()
    .min(2)
    .max(50)
    .regex(
      /^[a-z0-9-]+$/,
      'Subdomain can only contain lowercase letters, numbers, and hyphens'
    )
    .optional()
    .or(z.literal('')),
  domain: z.string().url().optional().or(z.literal('')),
  subscriptionTier: subscriptionTierSchema,
  maxUsers: z.number().int().min(1).max(1000),
  maxLocations: z.number().int().min(1).max(100),
  billingEmail: optionalEmailSchema,
  contactName: z.string().max(100).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  taxId: z.string().max(50).optional().or(z.literal('')),
  // settings: organizationSettingsSchema.optional(),
  // Admin invitation fields (optional)
  adminEmail: optionalEmailSchema,
  adminName: z.string().max(100).optional().or(z.literal('')),
});

// Update organization schema (all fields optional except id)
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  subdomain: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional()
    .or(z.literal('')),
  domain: z.string().url().optional().or(z.literal('')),
  status: organizationStatusSchema.optional(),
  subscriptionTier: subscriptionTierSchema.optional(),
  maxUsers: z.number().int().min(1).max(1000).optional(),
  maxLocations: z.number().int().min(1).max(100).optional(),
  billingEmail: optionalEmailSchema,
  contactName: z.string().max(100).optional().or(z.literal('')),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(200).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  taxId: z.string().max(50).optional().or(z.literal('')),
  settings: organizationSettingsSchema.optional(),
});

// Assign user to organization schema
export const assignUserToOrganizationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  organizationId: z.string().min(1, 'Organization ID is required'),
  roleId: z.string().min(1, 'Role ID is required'),
  isDefault: z.boolean().default(false),
});

// Update organization settings schema
export const updateOrganizationSettingsSchema =
  organizationSettingsSchema.partial();

// Type exports
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;
export type PosSettings = z.infer<typeof posSettingsSchema>;
export type FeatureSettings = z.infer<typeof featureSettingsSchema>;
export type BrandingSettings = z.infer<typeof brandingSettingsSchema>;
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export type InventorySettings = z.infer<typeof inventorySettingsSchema>;
export type OrganizationSettings = z.infer<typeof organizationSettingsSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type AssignUserToOrganizationInput = z.infer<
  typeof assignUserToOrganizationSchema
>;
