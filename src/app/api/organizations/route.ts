import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organization, userOrganization } from '@/drizzle/schema';
import { eq, ilike, or, desc, asc, sql, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { createOrganizationSchema } from '@/lib/validations/organization';
import { randomUUID } from 'crypto';
import { OrgStatus } from '@/lib/types/organization';
// import { getDefaultOrganizationSettings } from '@/drizzle/schema/organizations';

/**
 * GET /api/organizations
 * List all organizations (super admin only)
 */
async function getOrganizationsHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    // Build where clause
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(organization.name, `%${search}%`),
          ilike(organization.slug, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(organization.status, status as OrgStatus));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organization)
      .where(whereClause);

    // Type-safe mapping of sortBy parameter
    const sortableColumns = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      status: organization.status,
      subscriptionTier: organization.subscriptionTier,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    } as const;

    const sortColumn =
      sortableColumns[sortBy as keyof typeof sortableColumns] ||
      organization.createdAt;

    // Fetch organizations
    const organizations = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        subdomain: organization.subdomain,
        domain: organization.domain,
        status: organization.status,
        subscriptionTier: organization.subscriptionTier,
        maxUsers: organization.maxUsers,
        maxLocations: organization.maxLocations,
        billingEmail: organization.billingEmail,
        contactName: organization.contactName,
        contactPhone: organization.contactPhone,
        trialEndsAt: organization.trialEndsAt,
        subscriptionStartsAt: organization.subscriptionStartsAt,
        subscriptionEndsAt: organization.subscriptionEndsAt,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt,
      })
      .from(organization)
      .where(whereClause)
      .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    // Get user counts for each organization
    const orgsWithCounts = await Promise.all(
      organizations.map(async (org) => {
        const [{ userCount }] = await db
          .select({ userCount: sql<number>`count(*)` })
          .from(userOrganization)
          .where(eq(userOrganization.organizationId, org.id));

        return {
          ...org,
          userCount: Number(userCount),
        };
      })
    );

    return NextResponse.json({
      organizations: orgsWithCounts,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/organizations
 * Create a new organization (super admin only)
 */
async function createOrganizationHandler(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createOrganizationSchema.parse(body);

    // Check if slug is already taken
    const existingOrg = await db.query.organization.findFirst({
      where: eq(organization.slug, validatedData.slug),
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 400 }
      );
    }

    // Check subdomain if provided
    if (validatedData.subdomain) {
      const existingSubdomain = await db.query.organization.findFirst({
        where: eq(organization.subdomain, validatedData.subdomain),
      });

      if (existingSubdomain) {
        return NextResponse.json(
          { error: 'Subdomain already exists' },
          { status: 400 }
        );
      }
    }

    // Check domain if provided
    if (validatedData.domain) {
      const existingDomain = await db.query.organization.findFirst({
        where: eq(organization.domain, validatedData.domain),
      });

      if (existingDomain) {
        return NextResponse.json(
          { error: 'Domain already exists' },
          { status: 400 }
        );
      }
    }

    // Calculate trial end date (14 days from now)
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    // Create organization
    const [newOrg] = await db
      .insert(organization)
      .values({
        id: randomUUID(),
        name: validatedData.name,
        slug: validatedData.slug,
        subdomain: validatedData.subdomain,
        domain: validatedData.domain,
        status: 'trial',
        subscriptionTier: validatedData.subscriptionTier || 'starter',
        maxUsers: validatedData.maxUsers || 5,
        maxLocations: validatedData.maxLocations || 1,
        // settings: validatedData.settings || getDefaultOrganizationSettings(),
        billingEmail: validatedData.billingEmail,
        contactName: validatedData.contactName,
        contactPhone: validatedData.contactPhone,
        address: validatedData.address,
        city: validatedData.city,
        country: validatedData.country,
        taxId: validatedData.taxId,
        trialEndsAt,
      })
      .returning();

    return NextResponse.json(
      {
        message: 'Organization created successfully',
        organization: newOrg,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating organization:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          error: 'Invalid input data',
          details: (error as unknown as { errors: unknown }).errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}

// Protect routes with super admin permission
export const GET = protectRoute(getOrganizationsHandler, {
  requireSuperAdmin: true,
});

export const POST = protectRoute(createOrganizationHandler, {
  requireSuperAdmin: true,
});
