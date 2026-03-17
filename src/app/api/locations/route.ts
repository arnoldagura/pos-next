import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { location } from '@/drizzle/schema';
import { eq, ilike, or, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { buildCacheKey, cacheGet, cacheSet, invalidateEntityCache } from '@/lib/cache';
import { createLocationSchema } from '@/lib/validations';
import { randomUUID } from 'crypto';
import { ZodError } from 'zod';
import { requireTenantId } from '@/lib/tenant-context';

const LOCATION_CACHE_TTL = 600; // 10 minutes — locations rarely change

async function getLocationsHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const { searchParams } = new URL(req.url);
    const isActiveParam = searchParams.get('isActive');
    const search = searchParams.get('search');

    // Try cache for non-search queries
    if (!search) {
      const cacheKey = buildCacheKey('locations', tenantId, { isActive: isActiveParam });
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const query = db.select().from(location);

    // Build where conditions
    const conditions = [eq(location.organizationId, tenantId)];

    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      conditions.push(eq(location.isActive, isActive));
    }

    if (search) {
      const searchCondition = or(
        ilike(location.name, `%${search}%`),
        ilike(location.address, `%${search}%`),
        ilike(location.city, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const locations = await query.where(and(...conditions));

    const result = { locations };

    if (!search) {
      const cacheKey = buildCacheKey('locations', tenantId, { isActive: isActiveParam });
      await cacheSet(cacheKey, result, LOCATION_CACHE_TTL);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

async function createLocationHandler(req: NextRequest) {
  try {
    const tenantId = await requireTenantId();
    const body = await req.json();
    const validatedData = createLocationSchema.parse(body);

    const newLocation = await db
      .insert(location)
      .values({
        id: randomUUID(),
        organizationId: tenantId,
        ...validatedData,
      })
      .returning();

    await invalidateEntityCache('locations', tenantId);

    return NextResponse.json(newLocation[0], { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating location:', error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}

// GET /api/locations - List all locations
export const GET = protectRoute(getLocationsHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.READ,
});

// POST /api/locations - Create location (admin only)
export const POST = protectRoute(createLocationHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});
