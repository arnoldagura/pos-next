import { pgTable, text, timestamp, integer, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';

// Organization status enum
export const organizationStatusEnum = pgEnum('organization_status', [
  'active',
  'suspended',
  'trial',
  'cancelled',
]);

// Subscription tier enum
export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'starter',
  'professional',
  'enterprise',
]);

// Organization settings type
export interface OrganizationSettings {
  pos: {
    taxRate: number;
    currency: string;
    currencySymbol: string;
    receiptHeader: string;
    receiptFooter: string;
    allowDiscounts: boolean;
    maxDiscountPercent: number;
    requireCustomerInfo: boolean;
    enableTipping: boolean;
    defaultTipPercent: number;
    paymentMethods: string[];
    defaultPaymentMethod: string;
    autoCompleteOrders: boolean;
    printReceiptAuto: boolean;
    enableTableService: boolean;
    requireCashierApproval: boolean;
    approvalThreshold: number;
  };
  features: {
    advancedInventory: boolean;
    multiLocation: boolean;
    productionOrders: boolean;
    customerManagement: boolean;
    loyaltyProgram: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
  };
  branding: {
    logo: string;
    faviconUrl: string;
    primaryColor: string;
    accentColor: string;
    companyName: string;
  };
  notifications: {
    lowStockAlert: boolean;
    lowStockThreshold: number;
    dailySalesReport: boolean;
    weeklySalesReport: boolean;
    reportEmail: string;
    orderNotifications: boolean;
    inventoryAlerts: boolean;
  };
  inventory: {
    trackSerialNumbers: boolean;
    enableBarcodeScanning: boolean;
    autoDeductInventory: boolean;
    allowNegativeStock: boolean;
    defaultReorderPoint: number;
  };
}

// Organization table
export const organization = pgTable(
  'organization',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    subdomain: text('subdomain').unique(),
    domain: text('domain').unique(),
    status: organizationStatusEnum('status').default('trial').notNull(),
    subscriptionTier: subscriptionTierEnum('subscription_tier').default('starter').notNull(),
    maxUsers: integer('max_users').default(5).notNull(),
    maxLocations: integer('max_locations').default(1).notNull(),
    settings: jsonb('settings').$type<OrganizationSettings>(),
    billingEmail: text('billing_email'),
    contactName: text('contact_name'),
    contactPhone: text('contact_phone'),
    address: text('address'),
    city: text('city'),
    country: text('country'),
    taxId: text('tax_id'),
    trialEndsAt: timestamp('trial_ends_at'),
    subscriptionStartsAt: timestamp('subscription_starts_at'),
    subscriptionEndsAt: timestamp('subscription_ends_at'),
    deletedAt: timestamp('deleted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('organization_slug_idx').on(table.slug),
    index('organization_status_idx').on(table.status),
    index('organization_subdomain_idx').on(table.subdomain),
  ]
);

// Default settings function
export function getDefaultOrganizationSettings(): OrganizationSettings {
  return {
    pos: {
      taxRate: 0,
      currency: 'USD',
      currencySymbol: '$',
      receiptHeader: 'Thank you for your business!',
      receiptFooter: 'Please come again',
      allowDiscounts: true,
      maxDiscountPercent: 20,
      requireCustomerInfo: false,
      enableTipping: false,
      defaultTipPercent: 10,
      paymentMethods: ['cash', 'card'],
      defaultPaymentMethod: 'cash',
      autoCompleteOrders: true,
      printReceiptAuto: false,
      enableTableService: true,
      requireCashierApproval: false,
      approvalThreshold: 1000,
    },
    features: {
      advancedInventory: false,
      multiLocation: false,
      productionOrders: false,
      customerManagement: true,
      loyaltyProgram: false,
      advancedReporting: false,
      apiAccess: false,
    },
    branding: {
      logo: '',
      faviconUrl: '',
      primaryColor: '#3b82f6',
      accentColor: '#8b5cf6',
      companyName: '',
    },
    notifications: {
      lowStockAlert: true,
      lowStockThreshold: 10,
      dailySalesReport: false,
      weeklySalesReport: false,
      reportEmail: '',
      orderNotifications: true,
      inventoryAlerts: true,
    },
    inventory: {
      trackSerialNumbers: false,
      enableBarcodeScanning: true,
      autoDeductInventory: true,
      allowNegativeStock: false,
      defaultReorderPoint: 20,
    },
  };
}
