import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { role } from '@/drizzle/schema';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';

async function getRolesHandler() {
  try {
    const roles = await db
      .select({
        id: role.id,
        name: role.name,
        description: role.description,
      })
      .from(role);

    return NextResponse.json({ roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getRolesHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.READ,
});
