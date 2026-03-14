import { z } from 'zod';

export type Role = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    permissions: number;
  };
  permissions?: Permission[];
};

export type Permission = {
  id: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  organizationId: string | null;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoleWithPermissions = Role & {
  permissions: Permission[];
};

// Form schemas
export const createRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name is too long')
    .regex(/^[a-z_]+$/, 'Name must be lowercase letters and underscores only'),
  permissionIds: z.array(z.string()),
  description: z.string().optional(),
});

export const updateRoleSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name is too long')
    .regex(/^[a-z_]+$/, 'Name must be lowercase letters and underscores only')
    .optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export const createPermissionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().optional(),
  resource: z.string().min(1, 'Resource is required'),
  action: z.string().min(1, 'Action is required'),
});

export const updatePermissionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  description: z.string().optional(),
  resource: z.string().min(1, 'Resource is required').optional(),
  action: z.string().min(1, 'Action is required').optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;

// Permission grouping by resource
export type PermissionsByResource = {
  [resource: string]: Permission[];
};
