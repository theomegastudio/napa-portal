import { db } from '@/lib/db';
import { users, type User } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-helpers';
import { signIn } from '@/lib/auth';

export type Member = Pick<
  User,
  'id' | 'email' | 'organizationName' | 'isAdmin' | 'createdAt'
>;

/**
 * Get members of an organization
 */
export async function getOrgMembers(
  organizationName: string
): Promise<Member[]> {
  const user = await requireAuth();

  // Verify access - must be in the org or NAPA admin
  if (!user.isNapaAdmin && user.organizationName !== organizationName) {
    throw new Error('Unauthorized: Cannot view members of this organization');
  }

  const members = await db.query.users.findMany({
    where: eq(users.organizationName, organizationName),
    columns: {
      id: true,
      email: true,
      organizationName: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: desc(users.createdAt),
  });

  return members;
}

/**
 * Invite a user to an organization via magic link
 */
export async function inviteUser(
  email: string,
  organizationName: string,
  isAdmin: boolean
) {
  const currentUser = await requireAuth();

  // Verify permission - must be org admin or NAPA admin
  if (!currentUser.isNapaAdmin && !currentUser.isAdmin) {
    throw new Error('Unauthorized: Admin access required to invite members');
  }

  // Verify org access
  if (
    !currentUser.isNapaAdmin &&
    currentUser.organizationName !== organizationName
  ) {
    throw new Error('Unauthorized: Cannot invite to this organization');
  }

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existingUser) {
    if (existingUser.organizationName === organizationName) {
      throw new Error('User is already a member of this organization');
    }

    // Update existing user's organization
    await db
      .update(users)
      .set({
        organizationName,
        isAdmin,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    return { status: 'updated', userId: existingUser.id };
  }

  // For new users, we'll send them a magic link
  // When they sign in for the first time, Auth.js will create their user
  // We'll need to handle setting their org in a different way

  // For now, we trigger a sign-in which sends the magic link
  // The user will need to select their org after signing in
  // OR we can pre-create the user record

  // Pre-create user with pending status
  const [newUser] = await db
    .insert(users)
    .values({
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      organizationName,
      isAdmin,
    })
    .returning();

  // Note: In production, you'd send a custom invitation email here
  // For now, the user will use the standard sign-in flow

  return { status: 'invited', userId: newUser.id };
}

/**
 * Update a member's admin status
 */
export async function updateMemberRole(memberId: string, isAdmin: boolean) {
  const currentUser = await requireAuth();

  // Get the target member
  const member = await db.query.users.findFirst({
    where: eq(users.id, memberId),
  });

  if (!member) {
    throw new Error('Member not found');
  }

  // Verify permission
  if (!currentUser.isNapaAdmin) {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }
    if (currentUser.organizationName !== member.organizationName) {
      throw new Error('Unauthorized: Cannot modify members of other organizations');
    }
  }

  // Prevent self-demotion for the last admin
  if (memberId === currentUser.id && !isAdmin) {
    const adminCount = await db.query.users.findMany({
      where: and(
        eq(users.organizationName, member.organizationName!),
        eq(users.isAdmin, true)
      ),
    });

    if (adminCount.length <= 1) {
      throw new Error('Cannot remove the last admin from an organization');
    }
  }

  await db
    .update(users)
    .set({
      isAdmin,
      updatedAt: new Date(),
    })
    .where(eq(users.id, memberId));
}

/**
 * Remove a member from an organization
 */
export async function removeMember(memberId: string) {
  const currentUser = await requireAuth();

  // Get the target member
  const member = await db.query.users.findFirst({
    where: eq(users.id, memberId),
  });

  if (!member) {
    throw new Error('Member not found');
  }

  // Verify permission
  if (!currentUser.isNapaAdmin) {
    if (!currentUser.isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }
    if (currentUser.organizationName !== member.organizationName) {
      throw new Error('Unauthorized: Cannot remove members from other organizations');
    }
  }

  // Prevent self-removal
  if (memberId === currentUser.id) {
    throw new Error('Cannot remove yourself from the organization');
  }

  // Delete the user
  await db.delete(users).where(eq(users.id, memberId));
}
