import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { location } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { updateLocationSchema } from '@/lib/validations';
import { RouteContext, createDefaultRouteContext } from '@/lib/types/route';

async function getLocationHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [foundLocation] = await db
      .select()
      .from(location)
      .where(eq(location.id, id))
      .limit(1);

    if (!foundLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(foundLocation);
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    );
  }
}

async function updateLocationHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const validatedData = updateLocationSchema.parse(body);

    const [updatedLocation] = await db
      .update(location)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(location.id, id))
      .returning();

    if (!updatedLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedLocation);
  } catch (error: unknown) {
    console.error('Error updating location:', error);

    if (error instanceof Error) {
      if (error.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Validation error', details: error.cause },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    );
  }
}

async function deleteLocationHandler(
  req: NextRequest,
  context: RouteContext<{ id: string }> = createDefaultRouteContext({ id: '' })
) {
  try {
    const { id } = await context.params;

    const [deletedLocation] = await db
      .delete(location)
      .where(eq(location.id, id))
      .returning({ id: location.id });

    if (!deletedLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getLocationHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.READ,
});

export const PATCH = protectRoute(updateLocationHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});

export const DELETE = protectRoute(deleteLocationHandler, {
  resource: RESOURCES.SETTINGS,
  action: ACTIONS.UPDATE,
});
