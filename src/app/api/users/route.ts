import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { user, userRole, role } from '@/drizzle/schema';
import { eq, ilike, or, desc, asc, sql } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';

async function getUsersHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    const whereClause = search
      ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
      : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause);

    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(whereClause)
      .orderBy(
        sortOrder === 'asc'
          ? asc(user[sortBy as keyof typeof user])
          : desc(user[sortBy as keyof typeof user])
      )
      .limit(limit)
      .offset(offset);

    const usersWithRoles = await Promise.all(
      users.map(async (u) => {
        const roles = await db
          .select({
            roleId: userRole.roleId,
            roleName: role.name,
          })
          .from(userRole)
          .innerJoin(role, eq(userRole.roleId, role.id))
          .where(eq(userRole.userId, u.id));

        return {
          ...u,
          roles: roles.map((r) => ({
            id: r.roleId,
            name: r.roleName,
          })),
        };
      })
    );

    return NextResponse.json({
      users: usersWithRoles,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getUsersHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.READ,
});
