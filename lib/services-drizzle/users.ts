import { db } from '@/lib/db';
import { users, organizations, sessions } from '@/lib/db/schema';
import { eq, sql, and, ne } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { sendInvitationEmail } from '@/lib/services-drizzle/email';

async function requireNapaAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user) throw new Error('Unauthorized');

  // Check if user is NAPA Board or Director
  if (session.user.role !== 'napaBoard' && session.user.role !== 'napaDirector') {
    throw new Error('Unauthorized: NAPA staff required');
  }

  return session.user;
}

export async function getAllUsers() {
  await requireNapaAdmin();

  const result = await db
    .select()
    .from(users)
    .orderBy(users.email);

  return result.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    organizationName: user.organizationName,
    isAdmin: user.isAdmin,
    isNapaAdmin: user.role === 'napaBoard' || user.role === 'napaDirector',
    approvalStatus: user.approvalStatus,
    banned: user.banned,
    banReason: user.banReason,
    createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

export async function updateUser(
  userId: string,
  data: {
    email?: string;
    organizationName?: string;
    isAdmin?: boolean;
  }
) {
  await requireNapaAdmin();

  const updateData: Partial<typeof users.$inferInsert> = {};

  if (data.email !== undefined) updateData.email = data.email;
  if (data.organizationName !== undefined) updateData.organizationName = data.organizationName;
  if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;

  await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, userId));

  return { success: true };
}

export async function deleteUser(userId: string) {
  const admin = await requireNapaAdmin();

  // Prevent deleting yourself
  if (userId === admin.id) {
    throw new Error('Cannot delete yourself');
  }

  await db.delete(users).where(eq(users.id, userId));
  return { success: true };
}

export async function getOrganizations() {
  await requireNapaAdmin();

  const result = await db
    .select()
    .from(organizations)
    .orderBy(organizations.organizationName);

  return result.map(org => ({
    id: org.id,
    organizationName: org.organizationName,
    createdAt: org.createdAt?.toISOString() || new Date().toISOString(),
  }));
}

/**
 * Ban a user - sets banned flag and revokes all their sessions
 */
export async function banUser(userId: string, banReason?: string) {
  const admin = await requireNapaAdmin();

  // Prevent banning yourself
  if (userId === admin.id) {
    throw new Error('Cannot ban yourself');
  }

  // Verify user exists
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) throw new Error('User not found');

  // Set banned flag
  await db
    .update(users)
    .set({
      banned: true,
      banReason: banReason || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  // Revoke all sessions for the banned user
  await db.delete(sessions).where(eq(sessions.userId, userId));

  return { success: true };
}

/**
 * Unban a user - clears banned flag and reason
 */
export async function unbanUser(userId: string) {
  await requireNapaAdmin();

  await db
    .update(users)
    .set({
      banned: false,
      banReason: null,
      banExpires: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true };
}

/**
 * Invite a user to a specific organization (NAPA Admin only)
 * Pre-creates the user record with approved status and sends an invitation email
 */
export async function inviteUserToOrg(
  email: string,
  organizationName: string,
  isAdmin: boolean
) {
  const admin = await requireNapaAdmin();

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existingUser) {
    if (existingUser.organizationName === organizationName) {
      throw new Error('User is already a member of this organization');
    }
    if (existingUser.organizationName) {
      throw new Error(
        'This user already belongs to another organization. They must be removed first.'
      );
    }

    // Update existing user without an org
    await db
      .update(users)
      .set({
        organizationName,
        isAdmin,
        approvalStatus: 'approved',
        approvedBy: admin.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    // Send invitation email
    try {
      await sendInvitationEmail({
        email: email.toLowerCase(),
        organizationName,
        invitedByEmail: admin.email,
        isAdmin,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
    }

    return { status: 'updated', userId: existingUser.id };
  }

  // Pre-create user with approved status
  const [newUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      organizationName,
      isAdmin,
      approvalStatus: 'approved',
      approvedBy: admin.id,
      approvedAt: new Date(),
    })
    .returning();

  // Send invitation email
  try {
    await sendInvitationEmail({
      email: email.toLowerCase(),
      organizationName,
      invitedByEmail: admin.email,
      isAdmin,
    });
  } catch (emailError) {
    console.error('Failed to send invitation email:', emailError);
  }

  return { status: 'invited', userId: newUser.id };
}
