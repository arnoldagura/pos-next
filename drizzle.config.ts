import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle/migration',
  schema: './src/drizzle/schema',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
