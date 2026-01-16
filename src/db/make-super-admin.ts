import { db } from './db';
import { user, role, userRole } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Utility script to assign super_admin role to an existing user
 *
 * This script assigns the super_admin role to a user by their email.
 *
 * Usage:
 *   npx tsx src/db/make-super-admin.ts <email>
 *
 * Example:
 *   npx tsx src/db/make-super-admin.ts user@example.com
 */

async function makeSuperAdmin() {
  try {
    // Get email from command line argument
    const email = process.argv[2];

    if (!email) {
      console.error('❌ Error: Email address is required\n');
      console.log('Usage: npx tsx src/db/make-super-admin.ts <email>\n');
      console.log('Example:');
      console.log('  npx tsx src/db/make-super-admin.ts user@example.com\n');
      process.exit(1);
    }

    console.log(`\nSearching for user: ${email}...`);

    // Find user by email
    const [foundUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!foundUser) {
      console.error(`\n❌ Error: User not found with email: ${email}\n`);
      console.log('Available users:');

      // Show first 10 users as suggestions
      const users = await db.select().from(user).limit(10);
      users.forEach((u, index) => {
        console.log(`  ${index + 1}. ${u.name} (${u.email})`);
      });

      console.log('');
      process.exit(1);
    }

    console.log(`✓ Found user: ${foundUser.name} (${foundUser.id})\n`);

    // Get super_admin role
    const [superAdminRole] = await db
      .select()
      .from(role)
      .where(eq(role.name, 'super_admin'))
      .limit(1);

    if (!superAdminRole) {
      console.error('❌ super_admin role not found in database\n');
      console.log('The super_admin role must be created first.');
      console.log('Run: npx tsx src/db/seed-tenants.ts\n');
      process.exit(1);
    }

    console.log(`✓ Found super_admin role (${superAdminRole.id})\n`);

    // Check if user already has super_admin role
    const [existingAssignment] = await db
      .select()
      .from(userRole)
      .where(and(eq(userRole.userId, foundUser.id), eq(userRole.roleId, superAdminRole.id)))
      .limit(1);

    if (existingAssignment) {
      console.log('ℹ User already has super_admin role assigned\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ No changes needed');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }

    // Assign super_admin role
    await db.insert(userRole).values({
      userId: foundUser.id,
      roleId: superAdminRole.id,
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Super admin role assigned successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\nUser: ${foundUser.name} (${foundUser.email})`);
    console.log('Role: super_admin');
    console.log('\nThis user now has:');
    console.log('  • Access to all organizations');
    console.log('  • System-wide administrative privileges');
    console.log('  • Ability to manage all tenants\n');
  } catch (error) {
    console.error('❌ Error assigning super admin role:', error);
    throw error;
  }
}

makeSuperAdmin()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
