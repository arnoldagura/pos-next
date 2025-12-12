import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { productInventory } from './product-inventories';
import { materialInventory } from './material-inventories';

export const location = pgTable('location', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city'),
  state: text('state'),
  zipCode: text('zip_code'),
  country: text('country'),
  phone: text('phone'),
  email: text('email'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const locationRelations = relations(location, ({ many }) => ({
  productInventories: many(productInventory),
  materialInventories: many(materialInventory),
}));
