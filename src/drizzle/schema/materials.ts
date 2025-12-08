import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { materialCategory } from './categories';
import { supplier } from './suppliers';

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
    name: text('name').notNull(),
    sku: text('sku').unique(),
    description: text('description'),
    type: materialTypeEnum('type').notNull(),
    categoryId: text('category_id').references(() => materialCategory.id, {
      onDelete: 'set null',
    }),
    supplierId: text('supplier_id').references(() => supplier.id, {
      onDelete: 'set null',
    }),
    unitOfMeasure: text('unit_of_measure').notNull(),
    defaultCost: numeric('default_cost', { precision: 10, scale: 2 }),
    alertThreshold: numeric('alert_threshold', { precision: 10, scale: 2 }),
    expiryTracking: boolean('expiry_tracking').default(false).notNull(),
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
    nameIdx: index('material_name_idx').on(table.name),
    skuIdx: index('material_sku_idx').on(table.sku),
    typeIdx: index('material_type_idx').on(table.type),
    categoryIdx: index('material_category_idx').on(table.categoryId),
    supplierIdx: index('material_supplier_idx').on(table.supplierId),
    statusIdx: index('material_status_idx').on(table.status),
  })
);

export const materialRelations = relations(material, ({ one }) => ({
  category: one(materialCategory, {
    fields: [material.categoryId],
    references: [materialCategory.id],
  }),
  supplier: one(supplier, {
    fields: [material.supplierId],
    references: [supplier.id],
  }),
}));
