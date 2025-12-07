import { ColumnBaseConfig, ColumnDataType, relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  PgColumn,
} from 'drizzle-orm/pg-core';

export const productCategory = pgTable('product_category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  parentId: text('parent_id').references(
    (): PgColumn<ColumnBaseConfig<ColumnDataType, string>, object, object> =>
      productCategory.id,
    {
      onDelete: 'set null',
    }
  ),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  deletedAt: timestamp('deleted_at'), // For soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations for hierarchical product categories
export const productCategoryRelations = relations(productCategory, ({ one, many }) => ({
  parent: one(productCategory, {
    fields: [productCategory.parentId],
    references: [productCategory.id],
    relationName: 'parentChild',
  }),
  children: many(productCategory, {
    relationName: 'parentChild',
  }),
}));

export const materialCategory = pgTable('material_category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  parentId: text('parent_id').references(
    (): PgColumn<ColumnBaseConfig<ColumnDataType, string>, object, object> =>
      materialCategory.id,
    {
      onDelete: 'set null',
    }
  ),
  displayOrder: integer('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  deletedAt: timestamp('deleted_at'), // For soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Relations for hierarchical material categories
export const materialCategoryRelations = relations(materialCategory, ({ one, many }) => ({
  parent: one(materialCategory, {
    fields: [materialCategory.parentId],
    references: [materialCategory.id],
    relationName: 'parentChild',
  }),
  children: many(materialCategory, {
    relationName: 'parentChild',
  }),
}));
