import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/drizzle/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres connection with pooling
const queryClient = postgres(process.env.DATABASE_URL, {
  max: 10, // Maximum pool size
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout in seconds
});

// Create the drizzle instance with the schema
export const db = drizzle(queryClient, { schema });

// Export the schema for use in other files
export { schema };
