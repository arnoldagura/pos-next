import { ColumnBaseConfig, ColumnDataType, relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  PgColumn,
} from 'drizzle-orm/pg-core';

export const category = pgTable('category', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  image: text('image'),
  parentId: text('parent_id').references(
    (): PgColumn<ColumnBaseConfig<ColumnDataType, string>, object, object> =>
      category.id,
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

// Relations for hierarchical categories
export const categoryRelations = relations(category, ({ one, many }) => ({
  parent: one(category, {
    fields: [category.parentId],
    references: [category.id],
    relationName: 'parentChild',
  }),
  children: many(category, {
    relationName: 'parentChild',
  }),
}));
