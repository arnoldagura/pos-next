import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  numeric,
  index,
  unique,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { material } from './materials';
import { location } from './locations';
import { supplier } from './suppliers';
import { organization } from './organizations';

export const materialInventory = pgTable(
  'material_inventory',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    variantName: text('variant_name'),
    materialId: text('material_id')
      .notNull()
      .references(() => material.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .notNull()
      .references(() => location.id, { onDelete: 'cascade' }),
    sku: text('sku').unique(),
    defaultSupplierId: text('default_supplier_id').references(
      () => supplier.id,
      {
        onDelete: 'set null',
      }
    ),
    unitOfMeasure: text('unit_of_measure').notNull(),
    cost: numeric('cost', { precision: 10, scale: 2 }),
    currentQuantity: numeric('current_quantity', {
      precision: 10,
      scale: 2,
    }).notNull(),
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
    orgIdx: index('material_inventory_org_idx').on(table.organizationId),
    materialLocationUnique: unique(
      'material_inventory_material_location_unique'
    ).on(table.materialId, table.locationId),
    materialIdx: index('material_inventory_material_idx').on(table.materialId),
    locationIdx: index('material_inventory_location_idx').on(table.locationId),
    skuIdx: index('material_sku_idx').on(table.sku),
    supplierIdx: index('material_supplier_idx').on(table.defaultSupplierId),
  })
);

export const materialBatch = pgTable(
  'material_batch',
  {
    id: text('id').primaryKey(),
    materialInventoryId: text('material_inventory_id')
      .notNull()
      .references(() => materialInventory.id, { onDelete: 'cascade' }),
    batchNumber: text('batch_number').notNull(),
    expiryDate: timestamp('expiry_date'),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    cost: numeric('cost', { precision: 10, scale: 2 }).notNull(),
    remarks: text('remarks'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    materialInventoryIdx: index('material_batch_material_inventory_idx').on(
      table.materialInventoryId
    ),
    batchNumberIdx: index('material_batch_batch_number_idx').on(
      table.batchNumber
    ),
    expiryDateIdx: index('material_batch_expiry_date_idx').on(table.expiryDate),
  })
);

export const materialMovementTypeEnum = pgEnum('material_movement_type', [
  'purchase',
  'production_consumption',
  'adjustment',
  'waste',
  'expired',
  'transfer_in',
  'transfer_out',
  'transfer_to_pos',
]);

export const materialInventoryMovement = pgTable(
  'material_inventory_movement',
  {
    id: text('id').primaryKey(),
    materialInventoryId: text('material_inventory_id')
      .notNull()
      .references(() => materialInventory.id, { onDelete: 'cascade' }),
    batchId: text('batch_id').references(() => materialBatch.id, {
      onDelete: 'set null',
    }),
    type: materialMovementTypeEnum('type').notNull(),
    quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }),
    date: timestamp('date').notNull().defaultNow(),
    remarks: text('remarks'),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    createdBy: text('created_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    materialInventoryIdx: index(
      'material_inventory_movement_material_inventory_idx'
    ).on(table.materialInventoryId),
    batchIdx: index('material_inventory_movement_batch_idx').on(table.batchId),
    typeIdx: index('material_inventory_movement_type_idx').on(table.type),
    dateIdx: index('material_inventory_movement_date_idx').on(table.date),
    referenceIdx: index('material_inventory_movement_reference_idx').on(
      table.referenceType,
      table.referenceId
    ),
    createdByIdx: index('material_inventory_movement_created_by_idx').on(
      table.createdBy
    ),
  })
);

export const materialInventoryRelations = relations(
  materialInventory,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [materialInventory.organizationId],
      references: [organization.id],
    }),
    material: one(material, {
      fields: [materialInventory.materialId],
      references: [material.id],
    }),
    location: one(location, {
      fields: [materialInventory.locationId],
      references: [location.id],
    }),
    supplier: one(supplier, {
      fields: [materialInventory.defaultSupplierId],
      references: [supplier.id],
    }),
    batches: many(materialBatch),
    movements: many(materialInventoryMovement),
  })
);

export const materialBatchRelations = relations(
  materialBatch,
  ({ one, many }) => ({
    materialInventory: one(materialInventory, {
      fields: [materialBatch.materialInventoryId],
      references: [materialInventory.id],
    }),
    movements: many(materialInventoryMovement),
  })
);

export const materialInventoryMovementRelations = relations(
  materialInventoryMovement,
  ({ one }) => ({
    materialInventory: one(materialInventory, {
      fields: [materialInventoryMovement.materialInventoryId],
      references: [materialInventory.id],
    }),
    batch: one(materialBatch, {
      fields: [materialInventoryMovement.batchId],
      references: [materialBatch.id],
    }),
  })
);
