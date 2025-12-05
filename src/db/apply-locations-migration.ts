import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

async function applyMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log('Applying locations migration...');

    const migrationPath = join(
      process.cwd(),
      'drizzle',
      'migration',
      '0002_eminent_xavin.sql',
    );
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await sql.unsafe(migrationSQL);
    console.log('✓ Locations table created successfully!');
  } catch (error: unknown) {
    // Ignore errors for tables that already exist
    const pgError = error as { code?: string };
    if (pgError.code === '42P07') {
      console.log('⚠ Location table already exists, skipping...');
    } else {
      throw error;
    }
  } finally {
    await sql.end();
  }
}

applyMigration()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
