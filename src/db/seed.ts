import { db } from './db';
import { usersTable } from '@/drizzle/schema';

async function seed() {
  console.log('Seeding database...');

  // Example: Insert sample users
  await db.insert(usersTable).values([
    {
      name: 'John Doe',
      age: 30,
      email: 'john@example.com',
    },
    {
      name: 'Jane Smith',
      age: 25,
      email: 'jane@example.com',
    },
  ]);

  console.log('Database seeded successfully!');
}

seed()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
