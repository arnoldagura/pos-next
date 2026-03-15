import { headers } from 'next/headers';
import { db } from '@/db/db';
import { organization } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

interface TenantInfo {
  organizationId: string | null;
  organizationSlug: string | null;
  organization: typeof organization.$inferSelect | null;
}

/**
 * Extract tenant subdomain from a hostname.
 * Strips the configured app domain to find the tenant prefix.
 *
 * Examples with NEXT_PUBLIC_APP_DOMAIN="pos.arnoldagura.com":
 *   cafemaria.pos.arnoldagura.com → "cafemaria"
 *   pos.arnoldagura.com           → null (no tenant, it's the app root)
 *
 * Examples with NEXT_PUBLIC_APP_DOMAIN="localhost":
 *   acme.localhost:3000           → "acme"
 *   localhost:3000                → null
 */
export function extractTenantSubdomain(host: string): string | null {
  const hostWithoutPort = host.split(':')[0];
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost';

  // Host must end with the app domain and have something before it
  if (!hostWithoutPort.endsWith(appDomain)) {
    return null;
  }

  // Strip the app domain to get the tenant prefix
  // e.g. "cafemaria.pos.arnoldagura.com" minus ".pos.arnoldagura.com" = "cafemaria"
  const prefix = hostWithoutPort.slice(0, hostWithoutPort.length - appDomain.length);

  // No prefix means we're on the root domain (no tenant)
  if (!prefix || prefix === '.') {
    return null;
  }

  // Remove trailing dot: "cafemaria." → "cafemaria"
  const subdomain = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;

  // Skip www
  if (!subdomain || subdomain === 'www') {
    return null;
  }

  return subdomain;
}

/**
 * Check if current request has a tenant subdomain
 * Returns subdomain string if present, null otherwise
 */
export async function getCurrentSubdomain(): Promise<string | null> {
  const headersList = await headers();
  const host = headersList.get('host') || '';
  return extractTenantSubdomain(host);
}

/**
 * Get organization from subdomain
 * Example: acme.pos.arnoldagura.com -> "acme"
 * Example: acme.localhost:3000 -> "acme"
 */
export async function getOrganizationFromSubdomain(): Promise<TenantInfo> {
  const subdomain = await getCurrentSubdomain();

  if (!subdomain) {
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
  const [org] = await db.select().from(organization).where(eq(organization.slug, slug)).limit(1);

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
  const [org] = await db.select().from(organization).where(eq(organization.id, id)).limit(1);

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
      searchParams instanceof URLSearchParams ? searchParams.get('org') : searchParams.org;

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
