import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  numeric,
  index,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { inventory } from './inventories';

export const movementTypeEnum = pgEnum('movement_type', [
  'purchase',
  'sale',
  'adjustment',
  'waste',
  'transfer_in',
  'transfer_out',
  'production_output',
  'receive_from_material',
]);

export const inventoryMovement = pgTable(
  'inventory_movement',
  {
    id: text('id').primaryKey(),
    inventoryId: text('inventory_id')
      .notNull()
      .references(() => inventory.id, { onDelete: 'cascade' }),
    type: movementTypeEnum('type').notNull(),
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
    inventoryIdx: index('inventory_movement_inventory_idx').on(
      table.inventoryId
    ),
    typeIdx: index('inventory_movement_type_idx').on(table.type),
    dateIdx: index('inventory_movement_date_idx').on(table.date),
    referenceIdx: index('inventory_movement_reference_idx').on(
      table.referenceType,
      table.referenceId
    ),
    createdByIdx: index('inventory_movement_created_by_idx').on(
      table.createdBy
    ),
  })
);

export const inventoryMovementRelations = relations(
  inventoryMovement,
  ({ one }) => ({
    inventory: one(inventory, {
      fields: [inventoryMovement.inventoryId],
      references: [inventory.id],
    }),
  })
);
