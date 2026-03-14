import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { materialCategory } from './categories';
import { organization } from './organizations';

export const materialTypeEnum = pgEnum('material_type', [
  'raw_materials',
  'goods_for_resale',
  'operation_supplies',
  'wip_products',
]);

export const material = pgTable(
  'material',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    type: materialTypeEnum('type').notNull(),
    categoryId: text('category_id').references(() => materialCategory.id, {
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
    orgIdx: index('material_org_idx').on(table.organizationId),
    nameIdx: index('material_name_idx').on(table.name),
    typeIdx: index('material_type_idx').on(table.type),
    categoryIdx: index('material_category_idx').on(table.categoryId),
    statusIdx: index('material_status_idx').on(table.status),
  })
);

export const materialRelations = relations(material, ({ one }) => ({
  organization: one(organization, {
    fields: [material.organizationId],
    references: [organization.id],
  }),
  category: one(materialCategory, {
    fields: [material.categoryId],
    references: [materialCategory.id],
  }),
}));
