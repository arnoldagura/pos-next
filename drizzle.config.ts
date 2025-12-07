import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './src/drizzle/migration',
  schema: './src/drizzle/schema',

  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },

  extensionsFilters: ['postgis'],
  schemaFilter: 'public',
  tablesFilter: '*',

  introspect: {
    casing: 'camel',
  },

  migrations: {
    prefix: 'timestamp',
    table: '__drizzle_migrations__',
    schema: 'public',
  },

  entities: {
    roles: {
      provider: '',
      exclude: [],
      include: [],
    },
  },

  breakpoints: true,
  strict: true,
  verbose: true,
});
