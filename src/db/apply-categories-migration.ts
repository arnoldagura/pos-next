import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';
import { config } from 'dotenv';

config();

async function applyMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  try {
    console.log('Applying categories migration...');

    const migrationPath = join(
      process.cwd(),
      'drizzle',
      'migration',
      '0003_damp_zzzax.sql'
    );
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by statement breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        console.log('✓ Executed statement successfully');
      } catch (error: unknown) {
        // Ignore errors for tables that already exist
        const pgError = error as { code?: string };
        if (pgError.code === '42P07') {
          console.log('⚠ Table already exists, skipping...');
        } else {
          throw error;
        }
      }
    }

    console.log('✓ Categories migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
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
