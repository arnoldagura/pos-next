import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1,
  connect_timeout: 10,
});

async function migrate() {
  console.log('Starting organization_id migration...');

  // Check if there's at least one organization
  const orgs = await sql`SELECT id, name FROM organization LIMIT 1`;
  if (orgs.length === 0) {
    console.error('No organization found. Please create an organization first.');
    process.exit(1);
  }
  console.log(`Will backfill existing rows with org: "${orgs[0].name}" (${orgs[0].id})`);

  const tables = [
    'material_category',
    'product_category',
    'customer',
    'location',
    'supplier',
    'restaurant_table',
    'product',
    'material',
    'product_inventory',
    'material_inventory',
    'order',
    'production_recipe',
    'production_order',
  ];

  // Step 1: Add organization_id as nullable
  console.log('\nStep 1: Adding organization_id columns (nullable)...');
  for (const table of tables) {
    try {
      await sql.unsafe(`ALTER TABLE "${table}" ADD COLUMN "organization_id" text`);
      console.log(`  + ${table}: column added`);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '42701') {
        console.log(`  ~ ${table}: column already exists, skipping`);
      } else {
        throw e;
      }
    }
  }

  // Step 2: Backfill with first org's ID
  console.log('\nStep 2: Backfilling existing rows...');
  const orgId = orgs[0].id;
  for (const table of tables) {
    const result = await sql.unsafe(
      `UPDATE "${table}" SET "organization_id" = $1 WHERE "organization_id" IS NULL`,
      [orgId]
    );
    console.log(`  ~ ${table}: ${result.count} rows updated`);
  }

  // Step 3: Set NOT NULL
  console.log('\nStep 3: Setting NOT NULL constraints...');
  for (const table of tables) {
    await sql.unsafe(`ALTER TABLE "${table}" ALTER COLUMN "organization_id" SET NOT NULL`);
    console.log(`  + ${table}: NOT NULL set`);
  }

  // Step 4: Add foreign key constraints
  console.log('\nStep 4: Adding foreign key constraints...');
  for (const table of tables) {
    const constraintName = `${table}_organization_id_organization_id_fk`;
    try {
      await sql.unsafe(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${constraintName}" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action`
      );
      console.log(`  + ${table}: FK constraint added`);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '42710') {
        console.log(`  ~ ${table}: FK constraint already exists, skipping`);
      } else {
        throw e;
      }
    }
  }

  // Step 5: Create indexes
  console.log('\nStep 5: Creating indexes...');
  const indexNames: Record<string, string> = {
    material_category: 'material_category_org_idx',
    product_category: 'product_category_org_idx',
    customer: 'customer_org_idx',
    location: 'location_org_idx',
    supplier: 'supplier_org_idx',
    restaurant_table: 'restaurant_table_org_idx',
    product: 'product_org_idx',
    material: 'material_org_idx',
    product_inventory: 'product_inventory_org_idx',
    material_inventory: 'material_inventory_org_idx',
    order: 'order_org_idx',
    production_recipe: 'production_recipe_org_idx',
    production_order: 'production_order_org_idx',
  };

  for (const table of tables) {
    try {
      await sql.unsafe(
        `CREATE INDEX "${indexNames[table]}" ON "${table}" USING btree ("organization_id")`
      );
      console.log(`  + ${table}: index created`);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === '42P07') {
        console.log(`  ~ ${table}: index already exists, skipping`);
      } else {
        throw e;
      }
    }
  }

  // Also create audit_log and user_invitation tables if they don't exist
  console.log('\nStep 6: Creating audit_log and user_invitation tables...');
  try {
    await sql.unsafe(
      `CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired', 'cancelled')`
    );
    console.log('  + invitation_status enum created');
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '42710') {
      console.log('  ~ invitation_status enum already exists');
    } else {
      throw e;
    }
  }

  try {
    await sql.unsafe(`CREATE TABLE "audit_log" (
      "id" text PRIMARY KEY NOT NULL,
      "user_id" text NOT NULL,
      "action" text NOT NULL,
      "resource_type" text,
      "resource_id" text,
      "metadata" jsonb,
      "ip_address" text,
      "user_agent" text,
      "timestamp" timestamp DEFAULT now() NOT NULL
    )`);
    await sql.unsafe(
      `ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action`
    );
    console.log('  + audit_log table created');
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '42P07') {
      console.log('  ~ audit_log table already exists');
    } else {
      throw e;
    }
  }

  try {
    await sql.unsafe(`CREATE TABLE "user_invitation" (
      "id" text PRIMARY KEY NOT NULL,
      "email" text NOT NULL,
      "name" text,
      "organization_id" text NOT NULL,
      "role_id" text NOT NULL,
      "invited_by" text NOT NULL,
      "token" text NOT NULL,
      "status" "invitation_status" DEFAULT 'pending' NOT NULL,
      "expires_at" timestamp NOT NULL,
      "accepted_at" timestamp,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL,
      CONSTRAINT "user_invitation_token_unique" UNIQUE("token")
    )`);
    await sql.unsafe(
      `ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action`
    );
    await sql.unsafe(
      `ALTER TABLE "user_invitation" ADD CONSTRAINT "user_invitation_role_id_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role"("id") ON DELETE no action ON UPDATE no action`
    );
    console.log('  + user_invitation table created');
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '42P07') {
      console.log('  ~ user_invitation table already exists');
    } else {
      throw e;
    }
  }

  console.log('\n✓ Migration completed successfully!');
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    sql.end();
  });
