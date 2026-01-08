/**
 * Custom error classes for tenant-related errors
 * Provides structured error handling with HTTP status codes
 */

export class TenantError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class TenantNotSelectedError extends TenantError {
  constructor(message = 'No tenant selected. Please select an organization from the sidebar.') {
    super(message, 'TENANT_NOT_SELECTED', 400);
  }
}

export class NoTenantAccessError extends TenantError {
  constructor(message = 'No tenant context available. User must be assigned to an organization.') {
    super(message, 'NO_TENANT_ACCESS', 400);
  }
}

export class TenantAccessDeniedError extends TenantError {
  constructor(message = 'You do not have access to this organization') {
    super(message, 'TENANT_ACCESS_DENIED', 403);
  }
}

export class TenantNotFoundError extends TenantError {
  constructor(message = 'Organization not found') {
    super(message, 'TENANT_NOT_FOUND', 404);
  }
}

export class TenantSwitchRateLimitError extends TenantError {
  constructor(message = 'Too many tenant switches. Please try again later.') {
    super(message, 'TENANT_SWITCH_RATE_LIMIT', 429);
  }
}

/**
 * Type guard to check if error is a TenantError
 */
export function isTenantError(error: unknown): error is TenantError {
  return error instanceof TenantError;
}
