import { db } from './db';
import { role, permission, rolePermission } from '@/drizzle/schema';
import { randomUUID } from 'crypto';

// Default roles
const defaultRoles = [
  {
    id: randomUUID(),
    name: 'admin',
    description: 'Full system access with all permissions',
  },
  {
    id: randomUUID(),
    name: 'manager',
    description: 'Manages store operations, inventory, and staff',
  },
  {
    id: randomUUID(),
    name: 'cashier',
    description: 'Handles sales transactions and customer service',
  },
  {
    id: randomUUID(),
    name: 'kitchen',
    description: 'Manages kitchen orders and food preparation',
  },
  {
    id: randomUUID(),
    name: 'inventory',
    description: 'Manages inventory and stock levels',
  },
];

// Default permissions
const defaultPermissions = [
  // Product permissions
  {
    id: randomUUID(),
    name: 'products:create',
    description: 'Create new products',
    resource: 'products',
    action: 'create',
  },
  {
    id: randomUUID(),
    name: 'products:read',
    description: 'View products',
    resource: 'products',
    action: 'read',
  },
  {
    id: randomUUID(),
    name: 'products:update',
    description: 'Update existing products',
    resource: 'products',
    action: 'update',
  },
  {
    id: randomUUID(),
    name: 'products:delete',
    description: 'Delete products',
    resource: 'products',
    action: 'delete',
  },

  // Order permissions
  {
    id: randomUUID(),
    name: 'orders:create',
    description: 'Create new orders',
    resource: 'orders',
    action: 'create',
  },
  {
    id: randomUUID(),
    name: 'orders:read',
    description: 'View orders',
    resource: 'orders',
    action: 'read',
  },
  {
    id: randomUUID(),
    name: 'orders:update',
    description: 'Update order status',
    resource: 'orders',
    action: 'update',
  },
  {
    id: randomUUID(),
    name: 'orders:delete',
    description: 'Cancel/delete orders',
    resource: 'orders',
    action: 'delete',
  },

  // User permissions
  {
    id: randomUUID(),
    name: 'users:create',
    description: 'Create new users',
    resource: 'users',
    action: 'create',
  },
  {
    id: randomUUID(),
    name: 'users:read',
    description: 'View users',
    resource: 'users',
    action: 'read',
  },
  {
    id: randomUUID(),
    name: 'users:update',
    description: 'Update user information',
    resource: 'users',
    action: 'update',
  },
  {
    id: randomUUID(),
    name: 'users:delete',
    description: 'Delete users',
    resource: 'users',
    action: 'delete',
  },

  // Inventory permissions
  {
    id: randomUUID(),
    name: 'inventory:create',
    description: 'Add inventory items',
    resource: 'inventory',
    action: 'create',
  },
  {
    id: randomUUID(),
    name: 'inventory:read',
    description: 'View inventory',
    resource: 'inventory',
    action: 'read',
  },
  {
    id: randomUUID(),
    name: 'inventory:update',
    description: 'Update inventory levels',
    resource: 'inventory',
    action: 'update',
  },
  {
    id: randomUUID(),
    name: 'inventory:delete',
    description: 'Remove inventory items',
    resource: 'inventory',
    action: 'delete',
  },

  // Reports permissions
  {
    id: randomUUID(),
    name: 'reports:read',
    description: 'View reports and analytics',
    resource: 'reports',
    action: 'read',
  },
  {
    id: randomUUID(),
    name: 'reports:create',
    description: 'Generate custom reports',
    resource: 'reports',
    action: 'create',
  },

  // Settings permissions
  {
    id: randomUUID(),
    name: 'settings:read',
    description: 'View system settings',
    resource: 'settings',
    action: 'read',
  },
  {
    id: randomUUID(),
    name: 'settings:update',
    description: 'Modify system settings',
    resource: 'settings',
    action: 'update',
  },

  // Customer permissions
  {
    id: randomUUID(),
    name: 'customers:create',
    description: 'Create new customers',
    resource: 'customers',
    action: 'create',
  },
  {
    id: randomUUID(),
    name: 'customers:read',
    description: 'View customers',
    resource: 'customers',
    action: 'read',
  },
  {
    id: randomUUID(),
    name: 'customers:update',
    description: 'Update customer information',
    resource: 'customers',
    action: 'update',
  },
  {
    id: randomUUID(),
    name: 'customers:delete',
    description: 'Delete customers',
    resource: 'customers',
    action: 'delete',
  },
];

// Role-Permission mappings
const rolePermissionMappings = {
  admin: [
    // Admin has all permissions
    'products:create',
    'products:read',
    'products:update',
    'products:delete',
    'orders:create',
    'orders:read',
    'orders:update',
    'orders:delete',
    'customers:create',
    'customers:read',
    'customers:update',
    'customers:delete',
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'inventory:create',
    'inventory:read',
    'inventory:update',
    'inventory:delete',
    'reports:read',
    'reports:create',
    'settings:read',
    'settings:update',
  ],
  manager: [
    // Manager can manage most aspects but not system settings
    'products:create',
    'products:read',
    'products:update',
    'products:delete',
    'orders:create',
    'orders:read',
    'orders:update',
    'orders:delete',
    'customers:create',
    'customers:read',
    'customers:update',
    'customers:delete',
    'users:read',
    'inventory:create',
    'inventory:read',
    'inventory:update',
    'inventory:delete',
    'reports:read',
    'reports:create',
    'settings:read',
  ],
  cashier: [
    // Cashier can handle sales and view products
    'products:read',
    'orders:create',
    'orders:read',
    'orders:update',
    'customers:read',
    'customers:create',
  ],
  kitchen: [
    // Kitchen staff can view and update orders
    'products:read',
    'orders:read',
    'orders:update',
  ],
  inventory: [
    // Inventory staff manages stock
    'products:read',
    'inventory:create',
    'inventory:read',
    'inventory:update',
  ],
};

async function seedRBAC() {
  console.log('Seeding RBAC data...');

  try {
    // Insert roles
    console.log('Inserting roles...');
    await db.insert(role).values(defaultRoles);
    console.log(`✓ Inserted ${defaultRoles.length} roles`);

    // Insert permissions
    console.log('Inserting permissions...');
    await db.insert(permission).values(defaultPermissions);
    console.log(`✓ Inserted ${defaultPermissions.length} permissions`);

    // Create role-permission mappings
    console.log('Creating role-permission mappings...');
    const mappings = [];

    for (const [roleName, permissionNames] of Object.entries(rolePermissionMappings)) {
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
    console.log(`✓ Created ${mappings.length} role-permission mappings`);

    console.log('✓ RBAC data seeded successfully!');
  } catch (error) {
    console.error('Error seeding RBAC data:', error);
    throw error;
  }
}

seedRBAC()
  .catch((error) => {
    console.error('Error seeding database:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
