import { db } from './db';
import { user, userOrganization, organization, role } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

/**
 * Seed script to create an E2E test user
 *
 * Creates a test user with admin role in the first available organization.
 * Used for Playwright E2E test authentication.
 *
 * Usage:
 *   npx tsx src/db/seed-e2e-user.ts
 *
 * Environment variables:
 *   E2E_TEST_EMAIL    - Test user email (default: e2e-test@example.com)
 *   E2E_TEST_PASSWORD - Test user password (default: Test@123456)
 *   E2E_TEST_NAME     - Test user name (default: E2E Test User)
 */

async function seedE2EUser() {
  try {
    const email = process.env.E2E_TEST_EMAIL || 'e2e-test@example.com';
    const password = process.env.E2E_TEST_PASSWORD || 'Test@123456';
    const name = process.env.E2E_TEST_NAME || 'E2E Test User';

    console.log(`Creating E2E test user: ${email}\n`);

    // Check if user already exists
    const [existingUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);

    let userId: string;

    if (existingUser) {
      console.log(`User already exists: ${existingUser.id}`);
      userId = existingUser.id;
    } else {
      // Create user via Better Auth (handles password hashing)
      const result = await auth.api.signUpEmail({
        body: { email, password, name },
      });

      if (!result?.user) {
        throw new Error('Failed to create user');
      }

      userId = result.user.id;
      console.log(`Created user: ${userId}`);
    }

    // Find the first active organization
    const [org] = await db
      .select()
      .from(organization)
      .where(eq(organization.status, 'active'))
      .limit(1);

    if (!org) {
      console.error('No active organization found. Run seed-tenants.ts first.');
      process.exit(1);
    }

    console.log(`Using organization: ${org.name} (${org.id})`);

    // Check if user is already in this org
    const [existingMapping] = await db
      .select()
      .from(userOrganization)
      .where(eq(userOrganization.userId, userId))
      .limit(1);

    if (existingMapping) {
      console.log('User already assigned to an organization');
    } else {
      // Find admin role for this org
      const [adminRole] = await db.select().from(role).where(eq(role.name, 'admin')).limit(1);

      if (!adminRole) {
        console.error('No admin role found. Run seed-tenants.ts first.');
        process.exit(1);
      }

      await db.insert(userOrganization).values({
        userId,
        organizationId: org.id,
        roleId: adminRole.id,
        isDefault: true,
        joinedAt: new Date(),
      });

      console.log(`Assigned user to org with admin role`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('E2E test user ready!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log(`  Org:      ${org.name} (${org.slug})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('Error creating E2E test user:', error);
    throw error;
  }
}

seedE2EUser()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
