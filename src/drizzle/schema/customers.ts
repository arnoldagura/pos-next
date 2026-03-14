import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, varchar, boolean, index } from 'drizzle-orm/pg-core';
import { organization } from './organizations';

export const customer = pgTable(
  'customer',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 100 }),
    zipCode: varchar('zip_code', { length: 20 }),
    country: varchar('country', { length: 100 }),
    notes: text('notes'),
    loyaltyPoints: text('loyalty_points').default('0'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    createdBy: text('created_by'),
    updatedBy: text('updated_by'),
  },
  (table) => ({
    orgIdx: index('customer_org_idx').on(table.organizationId),
  })
);

export const customerRelations = relations(customer, ({ one }) => ({
  organization: one(organization, {
    fields: [customer.organizationId],
    references: [organization.id],
  }),
}));
