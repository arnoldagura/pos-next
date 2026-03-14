import { relations } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { location } from './locations';
import { organization } from './organizations';

export const tableStatusEnum = pgEnum('table_status', [
  'available',
  'occupied',
  'reserved',
  'maintenance',
]);

export const restaurantTable = pgTable(
  'restaurant_table',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
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
  },
  (table) => ({
    orgIdx: index('restaurant_table_org_idx').on(table.organizationId),
  })
);

export const restaurantTableRelations = relations(restaurantTable, ({ one }) => ({
  organization: one(organization, {
    fields: [restaurantTable.organizationId],
    references: [organization.id],
  }),
  location: one(location, {
    fields: [restaurantTable.locationId],
    references: [location.id],
  }),
}));
