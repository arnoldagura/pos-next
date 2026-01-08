import { headers } from 'next/headers';
import { db } from '@/db/db';
import { organization } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * Extract tenant information from the request
 * Supports multiple strategies: subdomain, path, query parameter
 */

interface TenantInfo {
  organizationId: string | null;
  organizationSlug: string | null;
  organization: typeof organization.$inferSelect | null;
}

/**
 * Check if current request has a subdomain
 * Returns subdomain string if present, null otherwise
 */
export async function getCurrentSubdomain(): Promise<string | null> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const hostWithoutPort = host.split(':')[0];
  const parts = hostWithoutPort.split('.');

  if (parts.length < 2) {
    return null;
  }

  const subdomain = parts[0];
  const domain = parts[parts.length - 1];

  // Skip if no subdomain, www, or just localhost
  if (!subdomain || subdomain === 'www' || (domain === 'localhost' && parts.length === 1)) {
    return null;
  }

  return subdomain;
}

/**
 * Get organization from subdomain
 * Example: acme.yourapp.com -> "acme"
 * Example: acme.localhost:3000 -> "acme"
 */
export async function getOrganizationFromSubdomain(): Promise<TenantInfo> {
  const headersList = await headers();
  const host = headersList.get('host') || '';

  // Remove port if present (e.g., "acme.localhost:3000" -> "acme.localhost")
  const hostWithoutPort = host.split(':')[0];

  // Extract subdomain
  const parts = hostWithoutPort.split('.');

  // For localhost: "acme.localhost" -> parts = ["acme", "localhost"]
  // For production: "acme.yourapp.com" -> parts = ["acme", "yourapp", "com"]

  // Need at least 2 parts (subdomain.domain)
  if (parts.length < 2) {
    return { organizationId: null, organizationSlug: null, organization: null };
  }

  const subdomain = parts[0];
  const domain = parts[parts.length - 1];

  // Skip if no subdomain or if it's www
  if (!subdomain || subdomain === 'www') {
    return { organizationId: null, organizationSlug: null, organization: null };
  }

  // For localhost, check if it's just "localhost" without subdomain
  if (domain === 'localhost' && parts.length === 1) {
    return { organizationId: null, organizationSlug: null, organization: null };
  }

  // Look up organization by subdomain
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.subdomain, subdomain))
    .limit(1);

  return {
    organizationId: org?.id || null,
    organizationSlug: org?.slug || null,
    organization: org || null,
  };
}

/**
 * Get organization by slug
 * Used for query parameter or path-based registration
 */
export async function getOrganizationBySlug(slug: string): Promise<TenantInfo> {
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.slug, slug))
    .limit(1);

  return {
    organizationId: org?.id || null,
    organizationSlug: org?.slug || null,
    organization: org || null,
  };
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(id: string): Promise<TenantInfo> {
  const [org] = await db
    .select()
    .from(organization)
    .where(eq(organization.id, id))
    .limit(1);

  return {
    organizationId: org?.id || null,
    organizationSlug: org?.slug || null,
    organization: org || null,
  };
}

/**
 * Get registration tenant info
 * Tries multiple strategies in order:
 * 1. Subdomain (acme.yourapp.com or acme.localhost:3000) - PRIMARY
 * 2. Query parameter (?org=slug) - FALLBACK
 * 3. Returns null if no tenant found
 */
export async function getRegistrationTenant(
  searchParams?: URLSearchParams | Record<string, string>
): Promise<TenantInfo> {
  // Strategy 1: Check subdomain (PRIMARY - best for multi-tenant SaaS)
  const subdomainInfo = await getOrganizationFromSubdomain();
  if (subdomainInfo.organization) {
    return subdomainInfo;
  }

  // Strategy 2: Check query parameter (FALLBACK - for flexibility)
  if (searchParams) {
    const orgParam =
      searchParams instanceof URLSearchParams
        ? searchParams.get('org')
        : searchParams.org;

    if (orgParam) {
      const tenantInfo = await getOrganizationBySlug(orgParam);
      if (tenantInfo.organization) {
        return tenantInfo;
      }
    }
  }

  // No tenant found
  return { organizationId: null, organizationSlug: null, organization: null };
}

/**
 * Validate if organization accepts new registrations
 */
export function canRegisterToOrganization(org: typeof organization.$inferSelect): boolean {
  // Check if organization is active
  if (org.status === 'cancelled' || org.status === 'suspended') {
    return false;
  }

  // Add any other business logic here
  // For example: check if organization has reached max users

  return true;
}
