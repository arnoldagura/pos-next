import { db } from './db';
import { location, organization } from '@/drizzle/schema';
import { randomUUID } from 'crypto';

async function seedLocations() {
  console.log('Seeding locations...');

  try {
    // Get the first organization to assign locations to
    const [org] = await db.select().from(organization).limit(1);
    if (!org) {
      console.error('No organization found. Please create an organization first.');
      return;
    }

    // Check if locations already exist
    const existingLocations = await db.select().from(location).limit(1);

    if (existingLocations.length > 0) {
      console.log('⚠ Locations already exist, skipping seed...');
      return;
    }

    const defaultLocations = [
      {
        id: randomUUID(),
        organizationId: org.id,
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
