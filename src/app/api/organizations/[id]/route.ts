import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { organization, userOrganization } from '@/drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { updateOrganizationSchema } from '@/lib/validations/organization';

/**
 * GET /api/organizations/:id
 * Get a single organization by ID (super admin only)
 */
async function getOrganizationHandler(
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  try {
    if (!context?.params) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const params = await context.params;
    const org = await db.query.organization.findFirst({
      where: eq(organization.id, params.id),
    });

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get user count
    const [{ userCount }] = await db
      .select({ userCount: sql<number>`count(*)` })
      .from(userOrganization)
      .where(eq(userOrganization.organizationId, params.id));

    return NextResponse.json({
      ...org,
      userCount: Number(userCount),
    });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/organizations/:id
 * Update an organization (super admin only)
 */
async function updateOrganizationHandler(
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  try {
    if (!context?.params) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const params = await context.params;
    const body = await req.json();
    const validatedData = updateOrganizationSchema.parse(body);

    // Check if organization exists
    const existingOrg = await db.query.organization.findFirst({
      where: eq(organization.id, params.id),
    });

    if (!existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Check for slug conflicts if slug is being updated
    if (validatedData.slug && validatedData.slug !== existingOrg.slug) {
      const slugConflict = await db.query.organization.findFirst({
        where: eq(organization.slug, validatedData.slug),
      });

      if (slugConflict) {
        return NextResponse.json(
          { error: 'Organization slug already exists' },
          { status: 400 }
        );
      }
    }

    // Check for subdomain conflicts if subdomain is being updated
    if (
      validatedData.subdomain &&
      validatedData.subdomain !== existingOrg.subdomain
    ) {
      const subdomainConflict = await db.query.organization.findFirst({
        where: eq(organization.subdomain, validatedData.subdomain),
      });

      if (subdomainConflict) {
        return NextResponse.json(
          { error: 'Subdomain already exists' },
          { status: 400 }
        );
      }
    }

    // Check for domain conflicts if domain is being updated
    if (validatedData.domain && validatedData.domain !== existingOrg.domain) {
      const domainConflict = await db.query.organization.findFirst({
        where: eq(organization.domain, validatedData.domain),
      });

      if (domainConflict) {
        return NextResponse.json(
          { error: 'Domain already exists' },
          { status: 400 }
        );
      }
    }

    // Update organization
    const [updatedOrg] = await db
      .update(organization)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(organization.id, params.id))
      .returning();

    return NextResponse.json({
      message: 'Organization updated successfully',
      organization: updatedOrg,
    });
  } catch (error) {
    console.error('Error updating organization:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: (error as unknown as { errors: unknown }).errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/organizations/:id
 * Soft delete an organization (super admin only)
 */
async function deleteOrganizationHandler(
  req: NextRequest,
  context?: { params: Promise<{ id: string }> }
) {
  try {
    if (!context?.params) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const params = await context.params;

    // Check if organization exists
    const existingOrg = await db.query.organization.findFirst({
      where: eq(organization.id, params.id),
    });

    if (!existingOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting deletedAt timestamp
    await db
      .update(organization)
      .set({
        deletedAt: new Date(),
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(organization.id, params.id));

    return NextResponse.json({
      message: 'Organization deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}

// Protect routes with super admin permission
export const GET = protectRoute(getOrganizationHandler, {
  requireSuperAdmin: true,
});

export const PATCH = protectRoute(updateOrganizationHandler, {
  requireSuperAdmin: true,
});

export const DELETE = protectRoute(deleteOrganizationHandler, {
  requireSuperAdmin: true,
});
