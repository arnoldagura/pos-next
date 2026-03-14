import { db } from '@/db/db';
import { userInvitation, organization, role } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';

export type InvitationDetails = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  organizationName: string;
  roleId: string;
  roleName: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: Date;
  createdAt: Date;
};

export function generateInvitationToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createUserInvitation({
  email,
  name,
  organizationId,
  roleId,
  invitedBy,
  expiresInDays = 7,
}: {
  email: string;
  name?: string;
  organizationId: string;
  roleId: string;
  invitedBy: string;
  expiresInDays?: number;
}) {
  const token = generateInvitationToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const invitationId = `inv_${randomBytes(16).toString('hex')}`;

  const [invitation] = await db
    .insert(userInvitation)
    .values({
      id: invitationId,
      email,
      name: name || null,
      organizationId,
      roleId,
      invitedBy,
      token,
      status: 'pending',
      expiresAt,
    })
    .returning();

  return invitation;
}

export async function getInvitationByToken(token: string) {
  const [invitation] = await db
    .select({
      id: userInvitation.id,
      email: userInvitation.email,
      name: userInvitation.name,
      organizationId: userInvitation.organizationId,
      organizationName: organization.name,
      roleId: userInvitation.roleId,
      roleName: role.name,
      status: userInvitation.status,
      expiresAt: userInvitation.expiresAt,
      createdAt: userInvitation.createdAt,
    })
    .from(userInvitation)
    .innerJoin(organization, eq(userInvitation.organizationId, organization.id))
    .innerJoin(role, eq(userInvitation.roleId, role.id))
    .where(eq(userInvitation.token, token))
    .limit(1);

  return invitation || null;
}

export async function validateInvitationToken(token: string): Promise<{
  valid: boolean;
  error?: string;
  invitation?: InvitationDetails;
}> {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return { valid: false, error: 'Invalid invitation link' };
  }

  if (invitation.status !== 'pending') {
    return { valid: false, error: 'This invitation has already been used' };
  }

  if (new Date() > invitation.expiresAt) {
    return { valid: false, error: 'This invitation has expired' };
  }

  return { valid: true, invitation };
}

export async function acceptInvitation(token: string) {
  await db
    .update(userInvitation)
    .set({
      status: 'accepted',
      acceptedAt: new Date(),
    })
    .where(eq(userInvitation.token, token));
}

export async function cancelInvitation(invitationId: string) {
  await db
    .update(userInvitation)
    .set({
      status: 'cancelled',
    })
    .where(eq(userInvitation.id, invitationId));
}

export async function getOrganizationInvitations(organizationId: string) {
  return await db
    .select({
      id: userInvitation.id,
      email: userInvitation.email,
      name: userInvitation.name,
      roleName: role.name,
      status: userInvitation.status,
      expiresAt: userInvitation.expiresAt,
      acceptedAt: userInvitation.acceptedAt,
      createdAt: userInvitation.createdAt,
    })
    .from(userInvitation)
    .innerJoin(role, eq(userInvitation.roleId, role.id))
    .where(eq(userInvitation.organizationId, organizationId))
    .orderBy(userInvitation.createdAt);
}

export function getInvitationUrl(token: string): string {
  const baseUrl =
    process.env.NODE_ENV === 'production'
      ? `https://${process.env.NEXT_PUBLIC_APP_DOMAIN || 'yourdomain.com'}`
      : 'http://localhost:3000';

  return `${baseUrl}/invite/${token}`;
}
