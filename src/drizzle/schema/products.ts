import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { productCategory } from './categories';
import { productInventory } from './product-inventories';
import { organization } from './organizations';

export const product = pgTable(
  'product',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
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
    orgIdx: index('product_org_idx').on(table.organizationId),
    nameIdx: index('product_name_idx').on(table.name),
    categoryIdx: index('product_category_idx').on(table.categoryId),
    statusIdx: index('product_status_idx').on(table.status),
  })
);

export const productRelations = relations(product, ({ one, many }) => ({
  organization: one(organization, {
    fields: [product.organizationId],
    references: [organization.id],
  }),
  category: one(productCategory, {
    fields: [product.categoryId],
    references: [productCategory.id],
  }),
  productInventories: many(productInventory),
}));
