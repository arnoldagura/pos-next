import { db } from './db';
import { user, role, userRole } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

async function assignAdmin() {
  try {
    console.log('Assigning admin role...');

    // Get the first user (or provide a specific email)
    const users = await db.select().from(user).limit(5);

    if (users.length === 0) {
      console.error('No users found in the database');
      process.exit(1);
    }

    console.log('\nAvailable users:');
    users.forEach((u, index) => {
      console.log(`${index + 1}. ${u.name} (${u.email})`);
    });

    // Get admin role
    const [adminRole] = await db
      .select()
      .from(role)
      .where(eq(role.name, 'admin'))
      .limit(1);

    if (!adminRole) {
      console.error('Admin role not found. Run seed-rbac.ts first.');
      process.exit(1);
    }

    // Assign admin role to the first user
    const firstUser = users[0];

    // Check if already assigned
    const existing = await db
      .select()
      .from(userRole)
      .where(eq(userRole.userId, firstUser.id))
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `\n✓ User ${firstUser.name} already has roles assigned.`,
      );
    } else {
      await db.insert(userRole).values({
        userId: firstUser.id,
        roleId: adminRole.id,
      });

      console.log(
        `\n✓ Admin role assigned to ${firstUser.name} (${firstUser.email})`,
      );
    }

    console.log('\nYou can now access the user management interface!');
    console.log('Visit: http://localhost:3000/dashboard/users');
  } catch (error) {
    console.error('Error assigning admin role:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

assignAdmin();
