import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { product } from './products';
import { location } from './locations';
import { restaurantTable } from './tables';
import { user } from './auth';

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'processing',
  'completed',
  'cancelled',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash',
  'card',
  'gcash',
  'maya',
  'bank_transfer',
  'other',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'paid',
  'partial',
  'refunded',
]);

export const order = pgTable(
  'order',
  {
    id: text('id').primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    locationId: text('location_id')
      .notNull()
      .references(() => location.id, { onDelete: 'cascade' }),
    tableId: text('table_id').references(() => restaurantTable.id, {
      onDelete: 'set null',
    }),
    customerId: text('customer_id'),
    customerName: text('customer_name'),
    status: orderStatusEnum('status').default('pending').notNull(),
    paymentMethod: paymentMethodEnum('payment_method'),
    paymentStatus: paymentStatusEnum('payment_status')
      .default('pending')
      .notNull(),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    totalDiscount: numeric('total_discount', { precision: 10, scale: 2 })
      .default('0')
      .notNull(),
    totalTax: numeric('total_tax', { precision: 10, scale: 2 })
      .default('0')
      .notNull(),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }),
    changeGiven: numeric('change_given', { precision: 10, scale: 2 }),
    notes: text('notes'),
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    completedAt: timestamp('completed_at'),
    cancelledAt: timestamp('cancelled_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    orderNumberIdx: index('order_number_idx').on(table.orderNumber),
    locationIdx: index('order_location_idx').on(table.locationId),
    statusIdx: index('order_status_idx').on(table.status),
    createdAtIdx: index('order_created_at_idx').on(table.createdAt),
  })
);

export const orderItem = pgTable(
  'order_item',
  {
    id: text('id').primaryKey(),
    orderId: text('order_id')
      .notNull()
      .references(() => order.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => product.id, { onDelete: 'restrict' }),
    productName: text('product_name').notNull(),
    productSku: text('product_sku'),
    quantity: integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    discount: numeric('discount', { precision: 10, scale: 2 })
      .default('0')
      .notNull(),
    discountType: text('discount_type', {
      enum: ['percentage', 'fixed'],
    }).default('fixed'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 })
      .default('0')
      .notNull(),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
    total: numeric('total', { precision: 10, scale: 2 }).notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    orderIdx: index('order_item_order_idx').on(table.orderId),
    productIdx: index('order_item_product_idx').on(table.productId),
  })
);

export const orderRelations = relations(order, ({ one, many }) => ({
  location: one(location, {
    fields: [order.locationId],
    references: [location.id],
  }),
  table: one(restaurantTable, {
    fields: [order.tableId],
    references: [restaurantTable.id],
  }),
  createdByUser: one(user, {
    fields: [order.createdBy],
    references: [user.id],
  }),
  items: many(orderItem),
}));

export const orderItemRelations = relations(orderItem, ({ one }) => ({
  order: one(order, {
    fields: [orderItem.orderId],
    references: [order.id],
  }),
  product: one(product, {
    fields: [orderItem.productId],
    references: [product.id],
  }),
}));
