import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { user, role, userOrganization } from '@/drizzle/schema';
import { eq, ilike, or, desc, asc, sql, and } from 'drizzle-orm';
import { protectRoute } from '@/middleware/rbac';
import { RESOURCES, ACTIONS } from '@/lib/rbac';
import { getTenantId } from '@/lib/tenant-context';
import { z } from 'zod';
import { auth } from '@/lib/auth';

async function getUsersHandler(req: NextRequest) {
  try {
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const offset = (page - 1) * limit;

    const searchClause = search
      ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
      : undefined;

    const [{ count }] = await db
      .select({ count: sql<number>`count(DISTINCT ${user.id})` })
      .from(user)
      .innerJoin(userOrganization, eq(user.id, userOrganization.userId))
      .where(and(eq(userOrganization.organizationId, tenantId), searchClause));

    const sortableColumns = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    } as const;

    const sortColumn =
      sortableColumns[sortBy as keyof typeof sortableColumns] || user.createdAt;

    const users = await db
      .selectDistinct({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .innerJoin(userOrganization, eq(user.id, userOrganization.userId))
      .where(and(eq(userOrganization.organizationId, tenantId), searchClause))
      .orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn))
      .limit(limit)
      .offset(offset);

    const usersWithRoles = await Promise.all(
      users.map(async (u) => {
        const orgRoles = await db
          .select({
            roleId: userOrganization.roleId,
            roleName: role.name,
          })
          .from(userOrganization)
          .innerJoin(role, eq(userOrganization.roleId, role.id))
          .where(
            and(
              eq(userOrganization.userId, u.id),
              eq(userOrganization.organizationId, tenantId)
            )
          );

        return {
          ...u,
          roles: orgRoles.map((r) => ({
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

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().min(1, 'Role is required'),
});

async function createUserHandler(req: NextRequest) {
  try {
    const tenantId = await getTenantId();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context available' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const validatedData = createUserSchema.parse(body);

    const [existingUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, validatedData.email))
      .limit(1);

    if (existingUser) {
      const [userInOrg] = await db
        .select()
        .from(userOrganization)
        .where(
          and(
            eq(userOrganization.userId, existingUser.id),
            eq(userOrganization.organizationId, tenantId)
          )
        )
        .limit(1);

      if (userInOrg) {
        return NextResponse.json(
          { error: 'User with this email is already in your organization' },
          { status: 400 }
        );
      }

      await db.insert(userOrganization).values({
        userId: existingUser.id,
        organizationId: tenantId,
        roleId: validatedData.roleId,
        joinedAt: new Date(),
      });

      return NextResponse.json(
        {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          emailVerified: existingUser.emailVerified,
          message: 'Existing user added to organization',
        },
        { status: 201 }
      );
    }

    const result = await auth.api.signUpEmail({
      body: {
        email: validatedData.email,
        password: validatedData.password,
        name: validatedData.name,
      },
    });

    if (!result || !result.user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    const userId = result.user.id;

    await db.insert(userOrganization).values({
      userId,
      organizationId: tenantId,
      roleId: validatedData.roleId,
      joinedAt: new Date(),
    });

    return NextResponse.json(
      {
        id: userId,
        name: result.user.name,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

export const GET = protectRoute(getUsersHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.READ,
});

export const POST = protectRoute(createUserHandler, {
  resource: RESOURCES.USERS,
  action: ACTIONS.CREATE,
});
