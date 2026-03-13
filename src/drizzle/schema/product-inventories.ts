import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  numeric,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { product } from './products';
import { location } from './locations';
import { productInventoryMovement } from './product-inventory-movements';
import { organization } from './organizations';

export const productInventory = pgTable(
  'product_inventory',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .notNull()
      .references(() => location.id, { onDelete: 'cascade' }),
    variantName: text('variant_name'),
    slug: text('slug').notNull().unique(),
    sku: text('sku').unique(),
    barcode: text('barcode').unique(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    cost: numeric('cost', { precision: 10, scale: 2 }),
    currentQuantity: numeric('current_quantity', {
      precision: 10,
      scale: 2,
    }).notNull(),
    unitOfMeasure: text('unit_of_measure').notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 })
      .default('0')
      .notNull(),
    alertThreshold: numeric('alert_threshold', { precision: 10, scale: 2 })
      .default('0')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    orgIdx: index('product_inventory_org_idx').on(table.organizationId),
    productInventoryLocationVariantUnique: unique(
      'product_inventory_product_location_variant_unique'
    ).on(table.productId, table.locationId, table.variantName),
    productIdx: index('product_inventory_product_idx').on(table.productId),
    locationIdx: index('inventory_location_idx').on(table.locationId),
    slugIdx: index('product_slug_idx').on(table.slug),
    skuIdx: index('product_sku_idx').on(table.sku),
    barcodeIdx: index('product_barcode_idx').on(table.barcode),
  })
);

export const productInventoryRelations = relations(
  productInventory,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [productInventory.organizationId],
      references: [organization.id],
    }),
    product: one(product, {
      fields: [productInventory.productId],
      references: [product.id],
    }),
    location: one(location, {
      fields: [productInventory.locationId],
      references: [location.id],
    }),
    movements: many(productInventoryMovement),
  })
);
