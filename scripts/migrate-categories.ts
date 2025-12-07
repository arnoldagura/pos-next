import postgres from 'postgres';
import { config } from 'dotenv';

config();

async function migrateCategories() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log('Starting category migration...');

    // Check if the old category table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'category'
      ) as exists
    `;

    if (!tableExists[0].exists) {
      console.log('Category table does not exist. Migration may have already been applied.');
      return;
    }

    console.log('Renaming category table to product_category...');
    await sql`ALTER TABLE "category" RENAME TO "product_category"`;
    console.log('✓ Table renamed');

    console.log('Removing image column from product_category...');
    await sql`ALTER TABLE "product_category" DROP COLUMN IF EXISTS "image"`;
    console.log('✓ Image column removed');

    console.log('Updating constraint names...');
    await sql`ALTER TABLE "product_category" RENAME CONSTRAINT "category_slug_unique" TO "product_category_slug_unique"`;
    console.log('✓ Unique constraint renamed');

    console.log('Updating foreign key constraints...');
    await sql`ALTER TABLE "product_category" DROP CONSTRAINT IF EXISTS "category_parent_id_category_id_fk"`;
    await sql`ALTER TABLE "product_category" ADD CONSTRAINT "product_category_parent_id_product_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_category"("id") ON DELETE set null ON UPDATE no action`;
    console.log('✓ Foreign key constraints updated');

    console.log('Creating material_category table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "material_category" (
        "id" text PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "slug" text NOT NULL,
        "parent_id" text,
        "display_order" integer DEFAULT 0 NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "deleted_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "material_category_slug_unique" UNIQUE("slug")
      )
    `;
    console.log('✓ Material category table created');

    await sql`ALTER TABLE "material_category" ADD CONSTRAINT "material_category_parent_id_material_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."material_category"("id") ON DELETE set null ON UPDATE no action`;
    console.log('✓ Material category foreign key constraint added');

    console.log('✓ Category migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

migrateCategories()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
