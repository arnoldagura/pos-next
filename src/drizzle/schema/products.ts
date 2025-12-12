import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { productCategory } from './categories';
import { productInventory } from './product-inventories';

export const product = pgTable(
  'product',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    categoryId: text('category_id').references(() => productCategory.id, {
      onDelete: 'set null',
    }),
    image: text('image'),
    status: boolean('status').default(true).notNull(),
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
    categoryIdx: index('product_category_idx').on(table.categoryId),
    statusIdx: index('product_status_idx').on(table.status),
  })
);

export const productRelations = relations(product, ({ one, many }) => ({
  category: one(productCategory, {
    fields: [product.categoryId],
    references: [productCategory.id],
  }),
  productInventories: many(productInventory),
}));
