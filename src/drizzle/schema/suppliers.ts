import { relations } from 'drizzle-orm';
import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { organization } from './organizations';

export const supplier = pgTable(
  'supplier',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    contactPerson: text('contact_person').notNull(),
    phone: text('phone'),
    address: text('address'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    orgIdx: index('supplier_org_idx').on(table.organizationId),
  })
);

export const supplierRelations = relations(supplier, ({ one }) => ({
  organization: one(organization, {
    fields: [supplier.organizationId],
    references: [organization.id],
  }),
}));
