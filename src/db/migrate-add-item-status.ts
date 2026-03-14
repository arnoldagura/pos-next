/**
 * Migration: Add item_status column to order_item table
 *
 * This migration adds item-level status tracking (pending/ready/served)
 * to support partial order fulfillment where some items can be ready
 * before others in the same order.
 */

import { sql } from 'drizzle-orm';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const client = postgres(connectionString, { max: 1 });

async function migrate() {
  try {
    console.log('Creating item_status enum type...');
    await client`
      CREATE TYPE item_status AS ENUM ('pending', 'ready', 'served')
    `.catch(() => {
      console.log('item_status enum already exists');
    });

    console.log('Adding item_status column to order_item table...');
    await client`
      ALTER TABLE order_item
      ADD COLUMN IF NOT EXISTS item_status item_status DEFAULT 'pending'::item_status NOT NULL
    `;

    console.log('Adding index on item_status...');
    await client`
      CREATE INDEX IF NOT EXISTS order_item_status_idx ON order_item(item_status)
    `;

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

migrate();
