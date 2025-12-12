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

export const productInventory = pgTable(
  'product_inventory',
  {
    id: text('id').primaryKey(),
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
    costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
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
    productInventoryLocationUnique: unique(
      'product_inventory_product_location_unique'
    ).on(table.productId, table.locationId),
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
