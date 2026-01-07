import { db } from './db';
import {
  organization,
  userOrganization,
  role,
  permission,
  rolePermission,
  user,
} from '@/drizzle/schema';
import { getDefaultOrganizationSettings } from '@/drizzle/schema/organizations';
import { randomUUID } from 'crypto';

/**
 * Seed script for multi-tenant setup
 * Creates:
 * 1. Legacy organization for existing data
 * 2. Super admin role (global)
 * 3. Default tenant-specific roles and permissions
 */

async function seedTenants() {
  console.log('🚀 Starting tenant seed process...\n');

  try {
    // ========================================================================
    // 1. CREATE SUPER ADMIN ROLE (GLOBAL)
    // ========================================================================
    console.log('📋 Step 1: Creating super admin role...');

    const superAdminRoleId = randomUUID();
    const superAdminRole = {
      id: superAdminRoleId,
      name: 'super_admin',
      description:
        'Global super administrator with access to all organizations',
      organizationId: null, // Global role
      isGlobal: true,
    };

    await db.insert(role).values(superAdminRole);
    console.log('✓ Super admin role created\n');

    // ========================================================================
    // 2. CREATE SUPER ADMIN PERMISSIONS (GLOBAL)
    // ========================================================================
    console.log('📋 Step 2: Creating super admin permissions...');

    const superAdminPermissions = [
      // Tenant/Organization management
      {
        id: randomUUID(),
        name: 'tenants:create',
        description: 'Create new organizations',
        resource: 'tenants',
        action: 'create',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'tenants:read',
        description: 'View all organizations',
        resource: 'tenants',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'tenants:update',
        description: 'Update organizations',
        resource: 'tenants',
        action: 'update',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'tenants:delete',
        description: 'Delete organizations',
        resource: 'tenants',
        action: 'delete',
        organizationId: null,
        isGlobal: true,
      },
      // Product permissions (global)
      {
        id: randomUUID(),
        name: 'products:create',
        description: 'Create products in any organization',
        resource: 'products',
        action: 'create',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'products:read',
        description: 'View products in any organization',
        resource: 'products',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'products:update',
        description: 'Update products in any organization',
        resource: 'products',
        action: 'update',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'products:delete',
        description: 'Delete products in any organization',
        resource: 'products',
        action: 'delete',
        organizationId: null,
        isGlobal: true,
      },
      // Order permissions (global)
      {
        id: randomUUID(),
        name: 'orders:create',
        description: 'Create orders in any organization',
        resource: 'orders',
        action: 'create',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'orders:read',
        description: 'View orders in any organization',
        resource: 'orders',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'orders:update',
        description: 'Update orders in any organization',
        resource: 'orders',
        action: 'update',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'orders:delete',
        description: 'Delete orders in any organization',
        resource: 'orders',
        action: 'delete',
        organizationId: null,
        isGlobal: true,
      },
      // User permissions (global)
      {
        id: randomUUID(),
        name: 'users:create',
        description: 'Create users in any organization',
        resource: 'users',
        action: 'create',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'users:read',
        description: 'View users in any organization',
        resource: 'users',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'users:update',
        description: 'Update users in any organization',
        resource: 'users',
        action: 'update',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'users:delete',
        description: 'Delete users in any organization',
        resource: 'users',
        action: 'delete',
        organizationId: null,
        isGlobal: true,
      },
      // Inventory permissions (global)
      {
        id: randomUUID(),
        name: 'inventory:create',
        description: 'Create inventory in any organization',
        resource: 'inventory',
        action: 'create',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'inventory:read',
        description: 'View inventory in any organization',
        resource: 'inventory',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'inventory:update',
        description: 'Update inventory in any organization',
        resource: 'inventory',
        action: 'update',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'inventory:delete',
        description: 'Delete inventory in any organization',
        resource: 'inventory',
        action: 'delete',
        organizationId: null,
        isGlobal: true,
      },
      // Customer permissions (global)
      {
        id: randomUUID(),
        name: 'customers:create',
        description: 'Create customers in any organization',
        resource: 'customers',
        action: 'create',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'customers:read',
        description: 'View customers in any organization',
        resource: 'customers',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'customers:update',
        description: 'Update customers in any organization',
        resource: 'customers',
        action: 'update',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'customers:delete',
        description: 'Delete customers in any organization',
        resource: 'customers',
        action: 'delete',
        organizationId: null,
        isGlobal: true,
      },
      // Reports permissions (global)
      {
        id: randomUUID(),
        name: 'reports:read',
        description: 'View reports in any organization',
        resource: 'reports',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'reports:create',
        description: 'Generate reports in any organization',
        resource: 'reports',
        action: 'create',
        organizationId: null,
        isGlobal: true,
      },
      // Settings permissions (global)
      {
        id: randomUUID(),
        name: 'settings:read',
        description: 'View settings in any organization',
        resource: 'settings',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'settings:update',
        description: 'Update settings in any organization',
        resource: 'settings',
        action: 'update',
        organizationId: null,
        isGlobal: true,
      },
      // Roles & Permissions management (global)
      {
        id: randomUUID(),
        name: 'roles:create',
        description: 'Create roles in any organization',
        resource: 'roles',
        action: 'create',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'roles:read',
        description: 'View roles in any organization',
        resource: 'roles',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'roles:update',
        description: 'Update roles in any organization',
        resource: 'roles',
        action: 'update',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'roles:delete',
        description: 'Delete roles in any organization',
        resource: 'roles',
        action: 'delete',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'permissions:read',
        description: 'View permissions in any organization',
        resource: 'permissions',
        action: 'read',
        organizationId: null,
        isGlobal: true,
      },
      {
        id: randomUUID(),
        name: 'permissions:assign',
        description: 'Assign permissions in any organization',
        resource: 'permissions',
        action: 'assign',
        organizationId: null,
        isGlobal: true,
      },
    ];

    await db.insert(permission).values(superAdminPermissions);
    console.log(`✓ Created ${superAdminPermissions.length} super admin permissions\n`);

    // Assign ALL permissions to super admin role
    const superAdminMappings = superAdminPermissions.map((perm) => ({
      roleId: superAdminRoleId,
      permissionId: perm.id,
    }));

    await db.insert(rolePermission).values(superAdminMappings);
    console.log(`✓ Assigned ${superAdminMappings.length} permissions to super admin role\n`);

    // ========================================================================
    // 3. CREATE LEGACY ORGANIZATION
    // ========================================================================
    console.log('📋 Step 3: Creating legacy organization for existing data...');

    const legacyOrgId = randomUUID();
    const legacyOrg = {
      id: legacyOrgId,
      name: 'Legacy Organization',
      slug: 'legacy',
      status: 'active' as const,
      subscriptionTier: 'professional' as const,
      maxUsers: 50,
      maxLocations: 10,
      settings: getDefaultOrganizationSettings(),
    };

    await db.insert(organization).values(legacyOrg);
    console.log('✓ Legacy organization created\n');

    // ========================================================================
    // 4. CREATE DEFAULT TENANT ROLES
    // ========================================================================
    console.log('📋 Step 4: Creating default tenant roles...');

    const defaultRoles = [
      {
        id: randomUUID(),
        name: 'admin',
        description: 'Organization administrator with full access',
        organizationId: legacyOrgId,
        isGlobal: false,
      },
      {
        id: randomUUID(),
        name: 'manager',
        description: 'Manages store operations, inventory, and staff',
        organizationId: legacyOrgId,
        isGlobal: false,
      },
      {
        id: randomUUID(),
        name: 'cashier',
        description: 'Handles sales transactions and customer service',
        organizationId: legacyOrgId,
        isGlobal: false,
      },
      {
        id: randomUUID(),
        name: 'kitchen',
        description: 'Manages kitchen orders and food preparation',
        organizationId: legacyOrgId,
        isGlobal: false,
      },
      {
        id: randomUUID(),
        name: 'inventory',
        description: 'Manages inventory and stock levels',
        organizationId: legacyOrgId,
        isGlobal: false,
      },
    ];

    await db.insert(role).values(defaultRoles);
    console.log(`✓ Created ${defaultRoles.length} tenant roles\n`);

    // ========================================================================
    // 5. CREATE DEFAULT TENANT PERMISSIONS
    // ========================================================================
    console.log('📋 Step 5: Creating default tenant permissions...');

    const resources = [
      'products',
      'orders',
      'customers',
      'users',
      'inventory',
      'reports',
      'settings',
    ];
    const actions = ['create', 'read', 'update', 'delete'];
    const defaultPermissions = [];

    for (const resource of resources) {
      for (const action of actions) {
        // Skip certain combinations
        if (
          resource === 'reports' &&
          (action === 'update' || action === 'delete')
        )
          continue;

        defaultPermissions.push({
          id: randomUUID(),
          name: `${resource}:${action}`,
          description: `${
            action.charAt(0).toUpperCase() + action.slice(1)
          } ${resource}`,
          resource,
          action,
          organizationId: legacyOrgId,
          isGlobal: false,
        });
      }
    }

    await db.insert(permission).values(defaultPermissions);
    console.log(`✓ Created ${defaultPermissions.length} tenant permissions\n`);

    // ========================================================================
    // 6. ASSIGN PERMISSIONS TO ROLES
    // ========================================================================
    console.log('📋 Step 6: Assigning permissions to roles...');

    const rolePermissionMappings = {
      admin: defaultPermissions.map((p) => p.name), // Admin gets all permissions
      manager: defaultPermissions
        .filter(
          (p) =>
            !p.name.startsWith('users:delete') &&
            !p.name.startsWith('settings:update')
        )
        .map((p) => p.name),
      cashier: [
        'products:read',
        'orders:create',
        'orders:read',
        'orders:update',
        'customers:read',
        'customers:create',
      ],
      kitchen: ['products:read', 'orders:read', 'orders:update'],
      inventory: [
        'products:read',
        'inventory:create',
        'inventory:read',
        'inventory:update',
      ],
    };

    const mappings = [];
    for (const [roleName, permissionNames] of Object.entries(
      rolePermissionMappings
    )) {
      const roleRecord = defaultRoles.find((r) => r.name === roleName);
      if (!roleRecord) continue;

      for (const permName of permissionNames) {
        const permRecord = defaultPermissions.find((p) => p.name === permName);
        if (permRecord) {
          mappings.push({
            roleId: roleRecord.id,
            permissionId: permRecord.id,
          });
        }
      }
    }

    await db.insert(rolePermission).values(mappings);
    console.log(`✓ Created ${mappings.length} role-permission mappings\n`);

    // ========================================================================
    // 7. ASSIGN EXISTING USERS TO LEGACY ORGANIZATION
    // ========================================================================
    console.log(
      '📋 Step 7: Migrating existing users to legacy organization...'
    );

    const existingUsers = await db.select().from(user);
    console.log(`Found ${existingUsers.length} existing users`);

    if (existingUsers.length > 0) {
      const adminRole = defaultRoles.find((r) => r.name === 'admin');

      const userOrgMappings = existingUsers.map((u) => ({
        userId: u.id,
        organizationId: legacyOrgId,
        roleId: adminRole!.id,
        isDefault: true,
        joinedAt: new Date(),
      }));

      await db.insert(userOrganization).values(userOrgMappings);
      console.log(
        `✓ Assigned ${existingUsers.length} users to legacy organization with admin role\n`
      );
    } else {
      console.log('ℹ No existing users to migrate\n');
    }

    // ========================================================================
    // 8. CREATE SUPER ADMIN USER (OPTIONAL)
    // ========================================================================
    console.log('📋 Step 8: Checking for super admin user...');
    console.log(
      'ℹ Super admin user should be created manually via registration'
    );
    console.log('ℹ After creating the user, assign super_admin role using:');
    console.log(
      "ℹ   INSERT INTO user_role (user_id, role_id) VALUES ('<user-id>', '" +
        superAdminRoleId +
        "');\n"
    );

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log(
      '════════════════════════════════════════════════════════════════'
    );
    console.log('✅ TENANT SEED COMPLETED SUCCESSFULLY!');
    console.log(
      '════════════════════════════════════════════════════════════════'
    );
    console.log('\n📊 Summary:');
    console.log(`   • Super Admin Role ID: ${superAdminRoleId}`);
    console.log(`   • Legacy Organization ID: ${legacyOrgId}`);
    console.log(`   • Tenant Roles: ${defaultRoles.length}`);
    console.log(`   • Tenant Permissions: ${defaultPermissions.length}`);
    console.log(`   • Migrated Users: ${existingUsers.length}`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Create a super admin user via /register');
    console.log('   2. Assign super_admin role to that user in database');
    console.log(
      '   3. Run migrations to add organizationId to business tables'
    );
    console.log(
      "   4. Update existing data with organizationId = '" + legacyOrgId + "'"
    );
    console.log(
      '════════════════════════════════════════════════════════════════\n'
    );
  } catch (error) {
    console.error('❌ Error seeding tenants:', error);
    throw error;
  }
}

// Run the seed function
seedTenants()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
