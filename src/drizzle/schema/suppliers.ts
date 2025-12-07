import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const supplier = pgTable('supplier', {
  id: text('id').primaryKey(),
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
});
