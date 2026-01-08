import { db } from '@/db/db';
import { auditLog } from '@/drizzle/schema';
import { randomUUID } from 'crypto';

interface AuditLogParams {
  userId: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLog).values({
      id: randomUUID(),
      userId: params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      metadata: params.metadata,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export async function logTenantSwitch(
  userId: string,
  oldTenantId: string | null,
  newTenantId: string,
  ipAddress?: string | null,
  userAgent?: string | null
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'tenant_switch',
    resourceType: 'organization',
    resourceId: newTenantId,
    metadata: {
      oldTenantId,
      newTenantId,
      timestamp: new Date().toISOString(),
    },
    ipAddress,
    userAgent,
  });
}

export async function logPermissionChange(
  userId: string,
  targetUserId: string,
  action: 'grant' | 'revoke',
  permission: string,
  organizationId?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'permission_change',
    resourceType: 'permission',
    resourceId: targetUserId,
    metadata: {
      action,
      permission,
      organizationId,
    },
  });
}

export async function logRoleAssignment(
  userId: string,
  targetUserId: string,
  roleId: string,
  organizationId?: string
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'role_assignment',
    resourceType: 'role',
    resourceId: targetUserId,
    metadata: {
      roleId,
      organizationId,
    },
  });
}
