import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  connect_timeout: 10,
});

async function migrate() {
  console.log('Adding "ready" to order_status enum...');

  // Check current enum values
  const currentValues =
    await sql`SELECT unnest(enum_range(NULL::order_status))::text as val`;
  const values = currentValues.map((r) => r.val);
  console.log('Current values:', values);

  if (values.includes('ready')) {
    console.log('"ready" already exists. Nothing to do.');
    await sql.end();
    return;
  }

  // Add 'ready' after 'processing' (before 'completed')
  await sql`ALTER TYPE order_status ADD VALUE 'ready' BEFORE 'completed'`;
  console.log('Added "ready" to order_status enum.');

  // Verify
  const updated =
    await sql`SELECT unnest(enum_range(NULL::order_status))::text as val`;
  console.log(
    'Updated values:',
    updated.map((r) => r.val)
  );

  await sql.end();
  console.log('Done.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
