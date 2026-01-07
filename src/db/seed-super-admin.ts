import { db } from './db';
import { user, role, userRole } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

/**
 * Seed script to create a super admin user
 *
 * This script creates a super admin user with global access to all organizations.
 *
 * Usage:
 *   npx tsx src/db/seed-super-admin.ts
 *
 * Environment variables (optional):
 *   SUPER_ADMIN_EMAIL - Email for the super admin (default: admin@example.com)
 *   SUPER_ADMIN_NAME - Name for the super admin (default: Super Admin)
 *   SUPER_ADMIN_PASSWORD - Password for the super admin (default: Admin@123)
 */

async function seedSuperAdmin() {
  try {
    console.log('Creating super admin user...\n');

    // Get configuration from environment or use defaults
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@example.com';
    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    let userId: string;

    if (existingUser.length > 0) {
      console.log(`ℹ User with email ${email} already exists`);
      userId = existingUser[0].id;
      console.log(`  Using existing user: ${existingUser[0].name} (${existingUser[0].id})\n`);
    } else {
      // Create new user with better-auth API (handles password hashing automatically)
      const newUser = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
      });

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      userId = newUser.user.id;
      console.log(`✓ Created user: ${name} (${email})`);
      console.log(`✓ Password hashed and stored securely\n`);
    }

    // Get super_admin role
    const [superAdminRole] = await db
      .select()
      .from(role)
      .where(eq(role.name, 'super_admin'))
      .limit(1);

    if (!superAdminRole) {
      console.error('❌ super_admin role not found. Run seed-tenants.ts first.');
      console.log('\nTo create the role, run:');
      console.log('  npx tsx src/db/seed-tenants.ts\n');
      process.exit(1);
    }

    console.log(`✓ Found super_admin role (${superAdminRole.id})\n`);

    // Check if user already has super_admin role
    const existingRole = await db
      .select()
      .from(userRole)
      .where(eq(userRole.userId, userId))
      .limit(1);

    if (existingRole.length > 0) {
      console.log(`ℹ User already has roles assigned`);

      // Check if it's specifically the super_admin role
      const hasSuperAdmin = existingRole.some(
        (ur) => ur.roleId === superAdminRole.id
      );

      if (hasSuperAdmin) {
        console.log(`✓ User already has super_admin role\n`);
      } else {
        // Assign super_admin role
        await db.insert(userRole).values({
          userId,
          roleId: superAdminRole.id,
        });
        console.log(`✓ Assigned super_admin role to user\n`);
      }
    } else {
      // Assign super_admin role
      await db.insert(userRole).values({
        userId,
        roleId: superAdminRole.id,
      });
      console.log(`✓ Assigned super_admin role to user\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Super admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\nLogin credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\n🔐 IMPORTANT: Change the password after first login!\n');
    console.log('You can now access:');
    console.log('  • Admin panel: http://localhost:3000/admin');
    console.log('  • All organizations and tenants');
    console.log('  • System-wide settings\n');
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    throw error;
  }
}

seedSuperAdmin()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
