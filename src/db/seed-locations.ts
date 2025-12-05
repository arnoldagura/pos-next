import { db } from './db';
import { location } from '@/drizzle/schema';
import { randomUUID } from 'crypto';

const defaultLocations = [
  {
    id: randomUUID(),
    name: 'Main Branch',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'USA',
    phone: '+1 (555) 123-4567',
    email: 'main@example.com',
    isActive: true,
  },
];

async function seedLocations() {
  console.log('Seeding locations...');

  try {
    // Check if locations already exist
    const existingLocations = await db.select().from(location).limit(1);

    if (existingLocations.length > 0) {
      console.log('⚠ Locations already exist, skipping seed...');
      return;
    }

    // Insert default locations
    await db.insert(location).values(defaultLocations);

    console.log(`✓ Inserted ${defaultLocations.length} location(s)`);
    console.log('✓ Locations seeded successfully!');
  } catch (error) {
    console.error('Error seeding locations:', error);
    throw error;
  }
}

seedLocations()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
