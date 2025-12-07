import { pgTable, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { location } from './locations';

export const tableStatusEnum = pgEnum('table_status', [
  'available',
  'occupied',
  'reserved',
  'maintenance',
]);

export const restaurantTable = pgTable('restaurant_table', {
  id: text('id').primaryKey(),
  number: text('number').notNull(),
  name: text('name').notNull(),
  capacity: integer('capacity').notNull(),
  status: tableStatusEnum('status').default('available').notNull(),
  locationId: text('location_id')
    .notNull()
    .references(() => location.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
