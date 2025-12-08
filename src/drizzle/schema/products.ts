import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  index,
} from 'drizzle-orm/pg-core';
import { productCategory } from './categories';

export const product = pgTable(
  'product',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    sku: text('sku').unique(),
    barcode: text('barcode').unique(),
    description: text('description'),
    sellingPrice: numeric('selling_price', {
      precision: 10,
      scale: 2,
    }).notNull(),
    costPrice: numeric('cost_price', { precision: 10, scale: 2 }),
    categoryId: text('category_id').references(() => productCategory.id, {
      onDelete: 'set null',
    }),
    image: text('image'),
    status: boolean('status').default(true).notNull(),
    unitOfMeasure: text('unit_of_measure'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0'),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
    deletedAt: timestamp('deleted_at'), // For soft delete
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    nameIdx: index('product_name_idx').on(table.name),
    slugIdx: index('product_slug_idx').on(table.slug),
    skuIdx: index('product_sku_idx').on(table.sku),
    barcodeIdx: index('product_barcode_idx').on(table.barcode),
    categoryIdx: index('product_category_idx').on(table.categoryId),
    statusIdx: index('product_status_idx').on(table.status),
  })
);

import { inventory } from './inventories';

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(productCategory, {
    fields: [product.categoryId],
    references: [productCategory.id],
  }),
  inventories: many(inventory),
}));
