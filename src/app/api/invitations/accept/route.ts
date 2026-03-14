import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { user, userOrganization } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { validateInvitationToken, acceptInvitation } from '@/lib/invitations';
import { auth } from '@/lib/auth';

/**
 * POST /api/invitations/accept
 * Accept an invitation and create user account
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, name, email, password } = body;

    if (!token || !name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const validation = await validateInvitationToken(token);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const invitation = validation.invitation!;

    if (email.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match invitation' }, { status: 400 });
    }

    const [existingUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    if (!result || !result.user) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }

    const userId = result.user.id;

    await db.insert(userOrganization).values({
      userId,
      organizationId: invitation.organizationId,
      roleId: invitation.roleId,
      isDefault: true,
      joinedAt: new Date(),
    });

    await acceptInvitation(token);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: userId,
        name: result.user.name,
        email: result.user.email,
      },
      organization: {
        id: invitation.organizationId,
        name: invitation.organizationName,
      },
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}
