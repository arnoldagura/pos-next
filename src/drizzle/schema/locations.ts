import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { productInventory } from './product-inventories';
import { materialInventory } from './material-inventories';
import { organization } from './organizations';

export const location = pgTable(
  'location',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
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
  },
  (table) => ({
    orgIdx: index('location_org_idx').on(table.organizationId),
  })
);

export const locationRelations = relations(location, ({ one, many }) => ({
  organization: one(organization, {
    fields: [location.organizationId],
    references: [organization.id],
  }),
  productInventories: many(productInventory),
  materialInventories: many(materialInventory),
}));
