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

export const inventory = pgTable(
  'inventory',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'cascade' }),
    locationId: text('location_id')
      .notNull()
      .references(() => location.id, { onDelete: 'cascade' }),
    alertThreshold: numeric('alert_threshold', { precision: 10, scale: 2 })
      .default('0')
      .notNull(),
    unitOfMeasure: text('unit_of_measure'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    productLocationUnique: unique('inventory_product_location_unique').on(
      table.productId,
      table.locationId
    ),
    productIdx: index('inventory_product_idx').on(table.productId),
    locationIdx: index('inventory_location_idx').on(table.locationId),
  })
);

import { inventoryMovement } from './inventory-movements';

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
  product: one(product, {
    fields: [inventory.productId],
    references: [product.id],
  }),
  location: one(location, {
    fields: [inventory.locationId],
    references: [location.id],
  }),
  movements: many(inventoryMovement),
}));
